import { supabase } from './supabase';

export type NotificationType = 'join' | 'create' | 'edit' | 'upload' | 'feedback';

export const sendNotification = async (params: {
  userId: string;
  bandId: string;
  songId?: string;
  type: NotificationType;
  message: string;
  fromUserId: string;
  fromUserName: string;
}) => {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    band_id: params.bandId,
    song_id: params.songId,
    type: params.type,
    message: params.message,
    from_user_id: params.fromUserId,
    from_user_name: params.fromUserName,
  });
  if (error) console.error('Failed to send notification:', error);
};

export const notifyBandMembers = async (params: {
  bandId: string;
  songId?: string;
  type: NotificationType;
  message: string;
  fromUserId: string;
  fromUserName: string;
  excludeSelf?: boolean;
}) => {
  // Get all band members
  const { data: members } = await supabase
    .from('hub_band_members')
    .select('user_id')
    .eq('band_id', params.bandId);

  if (!members) return;

  const notifications = members
    .filter(m => !params.excludeSelf || m.user_id !== params.fromUserId)
    .map(m => ({
      user_id: m.user_id,
      band_id: params.bandId,
      song_id: params.songId,
      type: params.type,
      message: params.message,
      from_user_id: params.fromUserId,
      from_user_name: params.fromUserName,
    }));

  if (notifications.length > 0) {
    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) console.error('Failed to send bulk notifications:', error);
  }
};

export const notifyBandOwner = async (params: {
  bandId: string;
  type: NotificationType;
  message: string;
  fromUserId: string;
  fromUserName: string;
}) => {
  const { data: band } = await supabase
    .from('hub_bands')
    .select('owner_id')
    .eq('id', params.bandId)
    .single();

  if (band) {
    await sendNotification({
      userId: band.owner_id,
      bandId: params.bandId,
      type: params.type,
      message: params.message,
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
    });
  }
};

export const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }

  return data || [];
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
};
