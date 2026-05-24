import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

async function broadcastNotification(
  userId: string,
  notification: {
    id: string;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: Date;
    type: NotificationType;
  },
) {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(`notifications:${userId}`, {
      config: { broadcast: { self: true } },
    });
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "new_notification",
      payload: {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      },
    });
    await supabase.removeChannel(channel);
  } catch {
    // Broadcast is best-effort; polling still works
  }
}

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  issueId?: string;
}) {
  const notification = await db.notification.create({ data: params });
  await broadcastNotification(params.userId, notification);
  return notification;
}

export async function notifyIssueUpdate(
  userId: string,
  issueId: string,
  title: string,
  message: string,
) {
  return createNotification({
    userId,
    type: "ISSUE_UPDATE",
    title,
    message,
    link: `/dashboard/reports/${issueId}`,
    issueId,
  });
}

export async function notifyVerificationRequest(
  userId: string,
  issueId: string,
  title: string,
) {
  return createNotification({
    userId,
    type: "VERIFICATION_REQUEST",
    title: "Verification needed",
    message: `Help verify the fix for "${title}" near you.`,
    link: `/verify/${issueId}`,
    issueId,
  });
}

export async function notifyStatusChange(
  userId: string,
  issueId: string,
  title: string,
  status: string,
) {
  return createNotification({
    userId,
    type: "STATUS_CHANGE",
    title: "Status updated",
    message: `"${title}" is now ${status.replace(/_/g, " ").toLowerCase()}.`,
    link: `/dashboard/reports/${issueId}`,
    issueId,
  });
}
