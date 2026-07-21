import { Bell, Lock, Moon, Settings, Shield, Sun } from "lucide-react";
import { useTheme } from "../../utils/theme";

export default function PortalSettingsPage({ portal = "portal" }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Cài đặt cổng thông tin</h2>
            <p className="text-sm text-muted-foreground capitalize">
              Tuỳ chỉnh cho cổng {portal}. Các thao tác với hệ thống sẽ được kết nối sau.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-muted/40 rounded-2xl p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span className="font-medium text-sm">Giao diện</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Áp dụng bảng màu giao diện mới của ParkSmart cho toàn bộ cổng và chuyển đổi giữa chế độ sáng/tối.
            </p>
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              {resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Đang hiển thị: <span className="font-medium text-foreground capitalize">{resolvedTheme}</span>
            </p>
          </div>

          <div className="bg-muted/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Bell size={16} />
              <span className="font-medium text-sm">Thông báo</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Quản lý cảnh báo, nhắc nhở và cập nhật hoạt động.
            </p>
            <label className="flex items-center justify-between text-sm">
              <span>Thông báo qua Email</span>
              <input type="checkbox" defaultChecked />
            </label>
          </div>

          <div className="bg-muted/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Shield size={16} />
              <span className="font-medium text-sm">Quyền riêng tư</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Khung giao diện cho các quy tắc hiển thị hồ sơ và quyền riêng tư sẽ có sau.
            </p>
            <label className="flex items-center justify-between text-sm">
              <span>Ẩn email cá nhân</span>
              <input type="checkbox" />
            </label>
          </div>

          <div className="bg-muted/40 rounded-2xl p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Lock size={16} />
              <span className="font-medium text-sm">Bảo mật</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Đặt lại mật khẩu và các tính năng bảo mật nâng cao sẽ được kết nối với hệ thống sau.
            </p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              Mở trang đặt lại mật khẩu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
