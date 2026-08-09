import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// 仅在 Web 静态导出时运行：为 Safari 的离线网页和主屏幕启动配置全局 HTML。
export default function Root({ children }: PropsWithChildren) {
  const basePath = process.env.EXPO_PUBLIC_BASE_PATH || '';
  const mobileEntry = `${basePath}/mobile/`;
  const mobileRedirect = `(function(){try{var ua=navigator.userAgent||'';var touchMac=/Macintosh/.test(ua)&&navigator.maxTouchPoints>1;var mobile=/iPhone|iPad|iPod|Android|Mobile/i.test(ua)||touchMac;if(mobile&&!location.pathname.includes('/mobile/'))location.replace(${JSON.stringify(
    mobileEntry
  )}+location.search+location.hash)}catch(error){}})();`;

  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: mobileRedirect }} />
        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
