import { ApiError } from '../../../../lib/auth/requireAdmin';
import { requireClient } from '../../../../lib/auth/requireClient';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateTicketId(value) {
  if (
    typeof value !== 'string' ||
    !UUID_PATTERN.test(value)
  ) {
    throw new ApiError(
      400,
      'The support ticket ID is invalid.'
    );
  }

  return value;
}

function validateMessage(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new ApiError(
      400,
      'A message is required.'
    );
  }

  const message = value.trim();

  if (message.length > 5000) {
    throw new ApiError(
      400,
      'Message cannot exceed 5000 characters.'
    );
  }

  return message;
}

async function getClient(
  supabase,
  profileId
) {
  const {
    data: client,
    error,
  } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', profileId)
    .single();

  if (error || !client) {
    throw new ApiError(
      404,
      'Your client record could not be found.'
    );
  }

  return client;
}

function normalizeTicket(ticket) {
  return {
    id: ticket.id,
    category: ticket.category,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    resolvedAt: ticket.resolved_at,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  };
}

export default async function handler(
  req,
  res
) {
  try {
    const ticketId =
      validateTicketId(req.query.id);

    const {
      profile,
      supabase,
    } = await requireClient(req);

    const client = await getClient(
      supabase,
      profile.id
    );

    const {
      data: ticket,
      error: ticketError,
    } = await supabase
      .from('client_support_tickets')
      .select(`
        id,
        category,
        subject,
        status,
        priority,
        resolved_at,
        created_at,
        updated_at
      `)
      .eq('id', ticketId)
      .eq('client_id', client.id)
      .maybeSingle();

    if (ticketError) {
      throw new ApiError(
        500,
        'The support ticket could not be loaded.'
      );
    }

    if (!ticket) {
      throw new ApiError(
        404,
        'Support ticket not found.'
      );
    }

    if (req.method === 'GET') {
      const {
        data: messages,
        error: messagesError,
      } = await supabase
        .from('client_support_messages')
        .select(`
          id,
          sender_user_id,
          message,
          created_at
        `)
        .eq('ticket_id', ticket.id)
        .order('created_at', {
          ascending: true,
        });

      if (messagesError) {
        throw new ApiError(
          500,
          'Support messages could not be loaded.'
        );
      }

      const senderIds = [
        ...new Set(
          (messages || [])
            .map(
              (item) =>
                item.sender_user_id
            )
            .filter(Boolean)
        ),
      ];

      const profileMap = new Map();

      if (senderIds.length > 0) {
        const {
          data: profiles,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select(
            'id, full_name, role'
          )
          .in('id', senderIds);

        if (profilesError) {
          throw new ApiError(
            500,
            'Support message authors could not be loaded.'
          );
        }

        (profiles || []).forEach(
          (sender) => {
            profileMap.set(
              sender.id,
              sender
            );
          }
        );
      }

      return res.status(200).json({
        ticket:
          normalizeTicket(ticket),
        messages:
          (messages || []).map(
            (item) => {
              const sender =
                profileMap.get(
                  item.sender_user_id
                );

              return {
                id: item.id,
                message: item.message,
                createdAt:
                  item.created_at,
                sender: sender
                  ? {
                      id: sender.id,
                      name:
                        sender.full_name ||
                        '',
                      role:
                        sender.role ||
                        '',
                    }
                  : null,
              };
            }
          ),
      });
    }

    if (req.method === 'POST') {
      if (ticket.status === 'closed') {
        throw new ApiError(
          400,
          'This support ticket is closed.'
        );
      }

      const message =
        validateMessage(
          req.body?.message
        );

      const {
        data: savedMessage,
        error: messageError,
      } = await supabase
        .from('client_support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_user_id:
            profile.id,
          message,
        })
        .select(`
          id,
          message,
          created_at
        `)
        .single();

      if (
        messageError ||
        !savedMessage
      ) {
        throw new ApiError(
          500,
          'Your support message could not be sent.'
        );
      }

      const updatedAt =
        new Date().toISOString();

      await supabase
        .from('client_support_tickets')
        .update({
          updated_at: updatedAt,
        })
        .eq('id', ticket.id)
        .eq('client_id', client.id);

      return res.status(201).json({
        message: {
          id: savedMessage.id,
          message:
            savedMessage.message,
          createdAt:
            savedMessage.created_at,
          sender: {
            id: profile.id,
            name:
              profile.full_name ||
              'Client',
            role: profile.role,
          },
        },
        updatedAt,
      });
    }

    res.setHeader(
      'Allow',
      'GET, POST'
    );

    return res.status(405).json({
      error: 'Method not allowed.',
    });
  } catch (error) {
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(
        'Client support ticket API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to process this support ticket right now.'
          : error.message,
    });
  }
}
