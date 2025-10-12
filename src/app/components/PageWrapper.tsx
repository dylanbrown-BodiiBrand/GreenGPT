export default function PageWrapper({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center px-6 py-16">
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-green-800">{title}</h1>
      {children && <div className="text-gray-600">{children}</div>}
    </section>
  );
}
