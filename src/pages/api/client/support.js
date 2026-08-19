import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

const VALID_CATEGORIES = new Set([
  'general',
  'account',
  'applications',
  'technical',
  'other',
]);

function validateCategory(value) {
  const category =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : 'general';

  if (!VALID_CATEGORIES.has(category)) {
    throw new ApiError(
      400,
      'Please select a valid support category.'
    );
  }

  return category;
}

function validateSubject(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new ApiError(
      400,
      'A subject is required.'
    );
  }

  const subject = value.trim();

  if (subject.length > 200) {
    throw new ApiError(
      400,
      'Subject cannot exceed 200 characters.'
    );
  }

  return subject;
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

export default async function handler(
  req,
  res
) {
  try {
    const {
      profile,
      supabase,
    } = await requireClient(req);

    const client = await getClient(
      supabase,
      profile.id
    );

    if (req.method === 'GET') {
      const {
        data: tickets,
        error,
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
        .eq('client_id', client.id)
        .order('updated_at', {
          ascending: false,
        })
        .limit(100);

      if (error) {
        throw new ApiError(
          500,
          'Support tickets could not be loaded.'
        );
      }

      return res.status(200).json({
        tickets:
          (tickets || []).map(
            normalizeTicket
          ),
      });
    }

    if (req.method === 'POST') {
      const category =
        validateCategory(
          req.body?.category
        );

      const subject =
        validateSubject(
          req.body?.subject
        );

      const message =
        validateMessage(
          req.body?.message
        );

      const {
        data: ticket,
        error: ticketError,
      } = await supabase
        .from('client_support_tickets')
        .insert({
          client_id: client.id,
          created_by: profile.id,
          category,
          subject,
          status: 'open',
          priority: 'normal',
        })
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
        .single();

      if (ticketError || !ticket) {
        throw new ApiError(
          500,
          'Your support ticket could not be created.'
        );
      }

      const {
        data: firstMessage,
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
        !firstMessage
      ) {
        await supabase
          .from('client_support_tickets')
          .delete()
          .eq('id', ticket.id)
          .eq('client_id', client.id);

        throw new ApiError(
          500,
          'Your support message could not be saved.'
        );
      }

      return res.status(201).json({
        message:
          'Support ticket created successfully.',
        ticket:
          normalizeTicket(ticket),
        firstMessage: {
          id: firstMessage.id,
          message:
            firstMessage.message,
          createdAt:
            firstMessage.created_at,
          sender: {
            id: profile.id,
            name:
              profile.full_name ||
              'Client',
            role: profile.role,
          },
        },
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
        'Client support API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to process your support request right now.'
          : error.message,
    });
  }
}
