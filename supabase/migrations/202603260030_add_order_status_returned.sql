-- Add returned status so delivered orders can be marked as returned by admin.

alter type public.order_status add value if not exists 'returned';