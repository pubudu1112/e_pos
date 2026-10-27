"use client";

import {
    Bell,
    Check,
    Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
    id: number;
    userId: number;
    type: string;
    title: string;
    message: string;
    referenceId: string | null;
    isRead: boolean;
    createdAt: string;
};

export default function NotificationBell() {
    const [notifications, setNotifications] =
        useState<NotificationItem[]>([]);

    const [unreadCount, setUnreadCount] =
        useState(0);

    const [loading, setLoading] =
        useState(false);

    const [open, setOpen] =
        useState(false);

    const [markingReadId, setMarkingReadId] =
        useState<number | null>(null);

    const dropdownRef =
        useRef<HTMLDivElement>(null);

    async function loadNotifications() {
        try {
            setLoading(true);

            const response = await fetch(
                "/api/notifications",
                {
                    method: "GET",
                    cache: "no-store",
                }
            );

            const result = await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                    "Unable to load notifications."
                );
            }

            setNotifications(
                Array.isArray(result.data)
                    ? result.data
                    : []
            );

            setUnreadCount(
                Number(result.unreadCount) || 0
            );
        } catch (error) {
            console.error(
                "Notification loading error:",
                error
            );
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(
        notificationId: number
    ) {
        try {
            const response = await fetch(
                `/api/notifications/${notificationId}`,
                {
                    method: "PATCH",
                }
            );

            const result = await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                    "Unable to mark notification as read."
                );
            }

            setNotifications((current) =>
                current.map((notification) =>
                    notification.id === notificationId
                        ? {
                            ...notification,
                            isRead: true,
                        }
                        : notification
                )
            );

            setUnreadCount((current) =>
                Math.max(current - 1, 0)
            );
        } catch (error) {
            console.error(
                "Mark notification as read error:",
                error
            );
        }
    }

    async function markAllAsRead() {
        try {
            const response = await fetch(
                "/api/notifications/read-all",
                {
                    method: "PATCH",
                }
            );

            const result = await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                    "Unable to mark all notifications as read."
                );
            }

            setNotifications((current) =>
                current.map((notification) => ({
                    ...notification,
                    isRead: true,
                }))
            );

            setUnreadCount(0);
        } catch (error) {
            console.error(
                "Mark all notifications as read error:",
                error
            );
        }
    }

    useEffect(() => {
        loadNotifications();

        const interval = setInterval(
            loadNotifications,
            30000
        );

        return () => {
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(
            event: MouseEvent
        ) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    function formatDate(
        dateString: string
    ) {
        const date = new Date(dateString);

        return date.toLocaleString(
            "en-LK",
            {
                dateStyle: "short",
                timeStyle: "short",
            }
        );
    }

    return (
        <div
            ref={dropdownRef}
            className="relative"
        >
            {/* =====================================================
          NOTIFICATION BUTTON
      ====================================================== */}

            <button
                type="button"
                onClick={() =>
                    setOpen((current) => !current)
                }
                className="
          relative
          rounded-xl
          p-2.5
          text-muted-foreground
          transition
          hover:bg-accent
          hover:text-foreground
        "
                aria-label="Notifications"
                aria-expanded={open}
            >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                    <span
                        className="
              absolute
              -right-1
              -top-1
              flex
              min-h-5
              min-w-5
              items-center
              justify-center
              rounded-full
              bg-red-500
              px-1
              text-[10px]
              font-bold
              text-white
              ring-2
              ring-background
            "
                    >
                        {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                    </span>
                )}
            </button>


            {/* =====================================================
          NOTIFICATION DROPDOWN
      ====================================================== */}

            {open && (
                <div
                    className="
            absolute
            right-0
            top-12
            z-50
            w-[360px]
            overflow-hidden
            rounded-2xl
            border
            border-border
            bg-background
            shadow-xl
          "
                >

                    {/* =================================================
              HEADER
          ================================================== */}

                    <div
                        className="
              flex
              items-center
              justify-between
              border-b
              border-border
              px-4
              py-3
            "
                    >
                        <div>
                            <h3 className="text-sm font-semibold">
                                Notifications
                            </h3>

                            <p className="text-xs text-muted-foreground">
                                {unreadCount} unread
                            </p>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="
      text-xs
      font-medium
      text-primary
      hover:underline
    "
                            >
                                Mark all as read
                            </button>
                        )}

                        {loading && (
                            <Loader2
                                className="
                  h-4
                  w-4
                  animate-spin
                  text-muted-foreground
                "
                            />
                        )}
                    </div>


                    {/* =================================================
              NOTIFICATION LIST
          ================================================== */}

                    <div className="max-h-[420px] overflow-y-auto">

                        {notifications.length === 0 ? (

                            <div
                                className="
                  px-4
                  py-10
                  text-center
                  text-sm
                  text-muted-foreground
                "
                            >
                                No notifications
                            </div>

                        ) : (

                            notifications.map(
                                (notification) => (

                                    <div
                                        key={notification.id}
                                        className={`
                      border-b
                      border-border
                      px-4
                      py-3
                      transition
                      hover:bg-accent/50
                      ${!notification.isRead
                                                ? "bg-primary/5"
                                                : ""
                                            }
                    `}
                                    >

                                        <div className="flex gap-3">

                                            {/* Status dot */}

                                            <div
                                                className={`
                          mt-1
                          h-2
                          w-2
                          shrink-0
                          rounded-full
                          ${notification.isRead
                                                        ? "bg-muted"
                                                        : "bg-primary"
                                                    }
                        `}
                                            />


                                            {/* Content */}

                                            <div className="min-w-0 flex-1">

                                                <div className="flex items-start justify-between gap-2">

                                                    <p className="text-sm font-semibold">
                                                        {notification.title}
                                                    </p>

                                                    {!notification.isRead && (
                                                        <span
                                                            className="
                                shrink-0
                                rounded-full
                                bg-primary/10
                                px-2
                                py-0.5
                                text-[10px]
                                font-medium
                                text-primary
                              "
                                                        >
                                                            New
                                                        </span>
                                                    )}

                                                </div>


                                                <p
                                                    className="
                            mt-1
                            text-xs
                            leading-5
                            text-muted-foreground
                          "
                                                >
                                                    {notification.message}
                                                </p>


                                                <div className="mt-2 flex items-center justify-between gap-2">

                                                    <p
                                                        className="
                              text-[10px]
                              text-muted-foreground/70
                            "
                                                    >
                                                        {formatDate(
                                                            notification.createdAt
                                                        )}
                                                    </p>


                                                    {/* Mark as read */}

                                                    {!notification.isRead && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                markAsRead(
                                                                    notification.id
                                                                )
                                                            }
                                                            disabled={
                                                                markingReadId ===
                                                                notification.id
                                                            }
                                                            className="
                                inline-flex
                                items-center
                                gap-1
                                rounded-md
                                px-2
                                py-1
                                text-[10px]
                                font-medium
                                text-primary
                                transition
                                hover:bg-primary/10
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                              "
                                                        >

                                                            {markingReadId ===
                                                                notification.id ? (
                                                                <Loader2
                                                                    className="
                                    h-3
                                    w-3
                                    animate-spin
                                  "
                                                                />
                                                            ) : (
                                                                <Check
                                                                    className="
                                    h-3
                                    w-3
                                  "
                                                                />
                                                            )}

                                                            Mark as read

                                                        </button>
                                                    )}

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                )
                            )

                        )}

                    </div>


                    {/* =================================================
              FOOTER
          ================================================== */}

                    <div
                        className="
              border-t
              border-border
              px-4
              py-2
            "
                    >

                        <button
                            type="button"
                            className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-lg
                px-3
                py-2
                text-xs
                font-medium
                text-muted-foreground
                transition
                hover:bg-accent
                hover:text-foreground
              "
                            onClick={() =>
                                setOpen(false)
                            }
                        >

                            <Check className="h-3.5 w-3.5" />

                            Close

                        </button>

                    </div>

                </div>
            )}

        </div>
    );
}