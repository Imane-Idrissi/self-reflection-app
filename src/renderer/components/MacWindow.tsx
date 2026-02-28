interface MacWindowProps {
  src: string;
  alt?: string;
}

export default function MacWindow({ src, alt = 'App screenshot' }: MacWindowProps) {
  return (
    <div style={{
      borderRadius: 16,
      background: '#F5F5F3',
      boxShadow: '0 25px 60px -12px rgba(0,0,0,0.18)',
      overflow: 'hidden',
      border: '1px solid #E7E5E4',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 20px',
        background: 'linear-gradient(to bottom, #FAFAF8, #F2F1ED)',
        borderBottom: '1px solid #E7E5E4',
      }}>
        <span style={{ height: 14, width: 14, borderRadius: '50%', background: '#FF5F57', flexShrink: 0 }} />
        <span style={{ height: 14, width: 14, borderRadius: '50%', background: '#FEBC2E', flexShrink: 0 }} />
        <span style={{ height: 14, width: 14, borderRadius: '50%', background: '#28C840', flexShrink: 0 }} />
      </div>
      <img src={src} alt={alt} style={{ display: 'block', width: '100%' }} draggable={false} />
    </div>
  );
}
