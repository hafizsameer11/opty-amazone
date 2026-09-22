import type { MarketplaceNotification } from './notification-service';

type Translate = (key: string, variables?: Record<string, string | number>) => string;

/** Localizes platform-generated notification copy while preserving user-entered previews and names. */
export function localizedSellerNotification(item: MarketplaceNotification, t: Translate) {
  const context = item.context || {};
  const order = String(context.order_no || context.order_id || '');
  const sender = String(context.sender_name || '');
  const preview = String(context.preview || '');
  const subject = String(context.product_name || context.store_name || '');
  const ticket = String(context.ticket_no || context.ticket_id || '');
  const status = String(context.status || '');
  const titleKey = `notifications.event.${item.type}.title`;
  const messageKey = `notifications.event.${item.type}.message`;
  const title = t(titleKey, { sender, order, subject, ticket, status });
  const message = t(messageKey, { sender, preview, order, subject, ticket, status });
  return {
    title: title === titleKey ? item.title : title,
    message: message === messageKey ? item.message : message,
  };
}
