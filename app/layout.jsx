import '../src/index.css'

export const metadata = {
  title: '北京邮电大学海南校区专享楼A座 · 空教室预约平台',
  description: '北京邮电大学海南校区专享楼A座空教室预约平台',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
