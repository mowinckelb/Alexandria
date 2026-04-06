import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — alexandria.",
};

export default function Terms() {
  return (
    <main style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: '4rem 1.5rem',
      fontFamily: 'var(--font-eb-garamond)',
      color: 'var(--text-primary)',
      lineHeight: 1.7,
    }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 400 }}>Terms of Service</h1>
      <p style={{ marginBottom: '1rem', fontSize: '0.85rem', opacity: 0.5 }}>Last updated: April 3, 2026</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>What this is</h2>
        <p>Alexandria is Greek philosophy infrastructure. It installs hooks into your AI coding environment (Claude Code, Cursor), maintains local markdown files on your machine, and serves a methodology (the Blueprint) from our server at mcp.mowinckel.ai. These terms govern your use of the Alexandria server, website, and Library at mowinckel.ai.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Your data</h2>
        <p>You own your cognitive data. Your Constitution, Vault, notepad, feedback log, and ontology are local files at <code>~/.alexandria/</code> on your machine. Alexandria does not store, access, or claim any rights to this data. If you stop using Alexandria, your files remain on your machine, unchanged and fully yours.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Published content</h2>
        <p>If you publish to the Library — shadow MDs, works, quizzes, or other content — that published content is stored on Alexandria&apos;s infrastructure. Publishing is always explicit: you review and approve before anything leaves your machine. You can unpublish or update at any time. Alexandria stores what you publish, never what you think. Published content may be accessed by other users and their AI agents according to the access tiers you set.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>The service</h2>
        <p>Alexandria is provided as-is. The service is in beta. Things may change, break, or be discontinued. We will give reasonable notice before changes that affect your data or access. The product is free during beta. Planned pricing: one tier, $10/month or free with 5 active kin. Slider pricing — pay what it is worth to you, no ceiling.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Accounts</h2>
        <p>Accounts are created via GitHub OAuth. One account per person. Your API key authenticates access to the Blueprint and Library. Do not share your API key.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Acceptable use</h2>
        <p>Use Alexandria for its intended purpose: developing your cognitive profile through AI conversations and publishing to the Library. Do not attempt to access other Authors&apos; private data, reverse-engineer the Blueprint methodology, abuse the API, or use the service to harm others.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Liability</h2>
        <p>Alexandria is not liable for data loss on your machine, AI outputs generated using your Constitution, service interruptions, or the content of published Library material. Your data sovereignty means your data responsibility. Published content is your responsibility — Alexandria does not moderate Library content but reserves the right to remove material that violates these terms.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Governing law</h2>
        <p>These terms are governed by the laws of the State of California, United States. Any disputes will be resolved in the state or federal courts located in San Francisco, California. If you are in the EU/EEA, this does not affect your rights under GDPR or local consumer protection laws.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Changes</h2>
        <p>These terms may be updated. Material changes will be communicated via email or the website. Continued use after changes constitutes acceptance.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 400 }}>Contact</h2>
        <p>Benjamin Mowinckel — <a href="mailto:benjamin@mowinckel.com" style={{ color: 'var(--text-primary)' }}>benjamin@mowinckel.com</a></p>
      </section>
    </main>
  );
}
