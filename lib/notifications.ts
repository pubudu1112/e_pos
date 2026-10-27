import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  userId: number;
  type: string;
  title: string;
  message: string;
  referenceId?: string | null;
};

export async function createNotification({
  userId,
  type,
  title,
  message,
  referenceId = null,
}: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      referenceId,
      isRead: false,
    },
  });
}