'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Home, Calendar, Users, Coffee, Settings, LogOut, Menu, X, ChevronRight } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    // ログアウト処理を実装
    router.push('/admin/login');
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/admin');
    }
  };

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: '管理画面', path: '/admin' }];

    paths.forEach((path, index) => {
      if (path === 'admin' && index === 0) return;

      const pathMap: { [key: string]: string } = {
        'reservations': '予約台帳',
        'shifts': 'シフト管理',
        'menu': 'メニュー管理',
        'settings': '営業設定',
        'dashboard': 'ダッシュボード',
        'create': '新規作成',
        'edit': '編集'
      };

      const name = pathMap[path] || path;
      const fullPath = '/' + paths.slice(0, index + 1).join('/');
      breadcrumbs.push({ name, path: fullPath });
    });

    return breadcrumbs;
  };

  const menuItems = [
    { name: 'ダッシュボード', path: '/admin/dashboard', icon: Home },
    { name: '予約台帳', path: '/admin/reservations', icon: Calendar },
    { name: 'シフト管理', path: '/admin/shifts', icon: Users },
    { name: 'メニュー管理', path: '/admin/menu', icon: Coffee },
    { name: '営業設定', path: '/admin/settings', icon: Settings },
  ];

  const isActivePath = (path: string) => {
    return pathname === path || (path !== '/admin' && pathname.startsWith(path));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">{process.env.NEXT_PUBLIC_SITE_NAME || "Cotoka"} Booking - 管理画面</h1>
            </div>

            {/* デスクトップメニュー */}
            <nav className="hidden md:flex space-x-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActivePath(item.path)
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center space-x-4">
              {/* 戻るボタン */}
              <button
                onClick={handleGoBack}
                className="hidden md:flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>戻る</span>
              </button>

              {/* ログアウトボタン */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">ログアウト</span>
              </button>

              {/* モバイルメニューボタン */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="md:hidden bg-slate-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* 戻るボタン（モバイル） */}
              <button
                onClick={handleGoBack}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>戻る</span>
              </button>

              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActivePath(item.path)
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* パンくずリスト */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-3 text-sm">
            {getBreadcrumbs().map((crumb, index) => (
              <div key={crumb.path} className="flex items-center space-x-2">
                {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
                <Link
                  href={crumb.path}
                  className={`${index === getBreadcrumbs().length - 1
                      ? 'text-slate-900 font-medium'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {crumb.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* フッター */}
      <footer className="bg-slate-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-sm text-slate-400">
                © 2024 {process.env.NEXT_PUBLIC_SITE_NAME || "Cotoka"} Booking. All rights reserved.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                管理者専用画面 - 認証されたユーザーのみアクセス可能
              </p>
            </div>
            <div className="flex space-x-6 text-sm text-slate-400">
              <span>バージョン: 1.0.0</span>
              <span>最終更新: {new Date().toLocaleDateString('ja-JP')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
