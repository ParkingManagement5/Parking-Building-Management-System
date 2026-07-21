export function asArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export function formatDateTime(value) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeTime(value) {
  if (!value) {
    return "Vừa xong";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));

  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} giờ trước`;
  }

  const diffDay = Math.round(diffHour / 24);
  return `${diffDay} ngày trước`;
}

export function formatDuration(fromValue, toValue) {
  if (!fromValue || !toValue) {
    return "--:--";
  }

  const start = new Date(fromValue);
  const end = new Date(toValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "--:--";
  }

  const diffMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getBookingStatus(item) {
  return String(
    item?.status || item?.bookingStatus || item?.sessionStatus || "pending"
  ).toLowerCase();
}

export function getStatusLabel(status) {
  const key = String(status || "pending").toLowerCase();
  const labels = {
    active: "Đang hoạt động",
    available: "Còn trống",
    confirmed: "Đã xác nhận",
    checked_in: "Đã vào bãi",
    completed: "Hoàn tất",
    paid: "Đã thanh toán",
    read: "Đã đọc",
    pending: "Đang chờ",
    reserved: "Đã đặt trước",
    processing: "Đang xử lý",
    unread: "Chưa đọc",
    inactive: "Không hoạt động",
    refunded: "Đã hoàn tiền",
    waiting_payment: "Chờ thanh toán",
    cancelled: "Đã huỷ",
    failed: "Thất bại",
  };

  if (labels[key]) {
    return labels[key];
  }

  const raw = String(status || "pending");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getStatusClasses(status) {
  const key = String(status || "pending").toLowerCase();
  const palette = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    checked_in: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    read: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    reserved: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    unread: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    inactive: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    refunded: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    waiting_payment: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  };

  return palette[key] || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300";
}
