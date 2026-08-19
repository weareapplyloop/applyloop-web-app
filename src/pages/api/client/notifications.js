import { ApiError } from '../../../lib/auth/requireAdmin';
import { requireClient } from '../../../lib/auth/requireClient';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateNotificationId(value) {
  if (
    typeof value !== 'string' ||
    !UUID_PATTERN.test(value)
  ) {
    throw new ApiError(
      400,
      'The notification ID is invalid.'
    );
  }

  return value;
}

function normalizeNotification(notification) {
  return {
    id: notification.id,
    applicationId:
      notification.application_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    href: notification.href,
    read: Boolean(notification.read_at),
    readAt: notification.read_at,
    createdAt: notification.created_at,
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
        data: notifications,
        error,
      } = await supabase
        .from('client_notifications')
        .select(`
          id,
          application_id,
          type,
          title,
          message,
          href,
          read_at,
          created_at
        `)
        .eq('client_id', client.id)
        .order('created_at', {
          ascending: false,
        })
        .limit(100);

      if (error) {
        throw new ApiError(
          500,
          'Notifications could not be loaded.'
        );
      }

      const normalized =
        (notifications || []).map(
          normalizeNotification
        );

      const unreadCount =
        normalized.filter(
          (notification) =>
            !notification.read
        ).length;

      return res.status(200).json({
        notifications: normalized,
        unreadCount,
      });
    }

    if (req.method === 'PATCH') {
      const markAllRead =
        req.body?.markAllRead === true;

      const notificationId =
        req.body?.notificationId;

      const readAt =
        new Date().toISOString();

      if (markAllRead) {
        const {
          error: updateError,
        } = await supabase
          .from('client_notifications')
          .update({
            read_at: readAt,
          })
          .eq('client_id', client.id)
          .is('read_at', null);

        if (updateError) {
          throw new ApiError(
            500,
            'Notifications could not be marked as read.'
          );
        }
      } else {
        const id =
          validateNotificationId(
            notificationId
          );

        const {
          data: notification,
          error: updateError,
        } = await supabase
          .from('client_notifications')
          .update({
            read_at: readAt,
          })
          .eq('id', id)
          .eq('client_id', client.id)
          .select('id')
          .maybeSingle();

        if (updateError) {
          throw new ApiError(
            500,
            'The notification could not be updated.'
          );
        }

        if (!notification) {
          throw new ApiError(
            404,
            'Notification not found.'
          );
        }
      }

      const {
        count,
        error: countError,
      } = await supabase
        .from('client_notifications')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('client_id', client.id)
        .is('read_at', null);

      if (countError) {
        throw new ApiError(
          500,
          'Unread notifications could not be counted.'
        );
      }

      return res.status(200).json({
        message: markAllRead
          ? 'All notifications marked as read.'
          : 'Notification marked as read.',
        unreadCount: count || 0,
      });
    }

    res.setHeader(
      'Allow',
      'GET, PATCH'
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
        'Client notifications API error:',
        error
      );
    }

    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? 'Unable to process notifications right now.'
          : error.message,
    });
  }
}
