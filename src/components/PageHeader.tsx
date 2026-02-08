export default function PageHeader(props: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{props.title}</div>
      {props.subtitle ? (
        <div style={{ opacity: 0.75, marginTop: 6 }}>{props.subtitle}</div>
      ) : null}
    </div>
  );
}
