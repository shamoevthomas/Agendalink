import AdminLayoutClientWrapper from '@/components/AdminLayoutClientWrapper';

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminLayoutClientWrapper>{children}</AdminLayoutClientWrapper>;
}
