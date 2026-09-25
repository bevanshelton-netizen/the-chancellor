export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#090806 0%,#11100d 72%,#17130e 100%)",
        color: "#f4efe4",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <section
        style={{
          width: "min(1180px, calc(100% - 40px))",
          margin: "0 auto",
          padding: "clamp(72px,10vw,132px) 0 88px",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.2fr) minmax(280px,.8fr)",
          gap: "clamp(36px,7vw,88px)",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              color: "#c9a653",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: ".18em",
              fontWeight: 900,
              margin: 0,
            }}
          >
            The Chancellor&apos;s Business Growth Desk
          </p>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(3.6rem,8vw,7.4rem)",
              lineHeight: .9,
              letterSpacing: "-.055em",
              fontWeight: 500,
              margin: "18px 0 28px",
              maxWidth: "900px",
            }}
          >
            Diagnose first.
            <br />
            <span style={{ color: "#f0d88c" }}>Then move forward.</span>
          </h1>
          <p
            style={{
              maxWidth: "760px",
              color: "#c8c0b4",
              fontSize: "clamp(1.05rem,1.6vw,1.25rem)",
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            Structured business diagnosis, guided growth pathways and responsible professional routing for entrepreneurs who need a clearer next step.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "32px" }}>
            <a
              href="/auth/signup"
              style={{
                minHeight: "50px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 22px",
                borderRadius: "999px",
                background: "linear-gradient(135deg,#f0d88c,#c9a653)",
                color: "#17120a",
                textDecoration: "none",
                fontWeight: 900,
              }}
            >
              Start with The Chancellor
            </a>
            <a
              href="/ask"
              style={{
                minHeight: "50px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 22px",
                borderRadius: "999px",
                border: "1px solid #5a4a2f",
                color: "#f4efe4",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Ask a business question
            </a>
          </div>
        </div>

        <aside
          style={{
            border: "1px solid #4b3d27",
            borderRadius: "28px",
            padding: "30px",
            background: "linear-gradient(160deg,rgba(35,29,20,.92),rgba(14,12,9,.96))",
            boxShadow: "0 30px 90px rgba(0,0,0,.32)",
          }}
        >
          <p
            style={{
              color: "#c9a653",
              textTransform: "uppercase",
              letterSpacing: ".14em",
              fontSize: "11px",
              fontWeight: 900,
              marginTop: 0,
            }}
          >
            A clearer route through complexity
          </p>
          {[
            ["01", "Diagnose", "Understand the real obstacle before spending more money or effort."],
            ["02", "Prioritise", "Identify the smallest sensible next move and what can wait."],
            ["03", "Act responsibly", "Use the right business, specialist or regulated pathway for the issue."],
          ].map(([number, title, copy]) => (
            <div key={number} style={{ borderTop: "1px solid #3b3123", padding: "20px 0" }}>
              <div style={{ color: "#f0d88c", fontSize: "11px", fontWeight: 900, letterSpacing: ".12em" }}>{number}</div>
              <strong
                style={{
                  display: "block",
                  margin: "6px 0",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "22px",
                  fontWeight: 500,
                }}
              >
                {title}
              </strong>
              <span style={{ color: "#aaa397", lineHeight: 1.6 }}>{copy}</span>
            </div>
          ))}
        </aside>
      </section>

      <section style={{ borderTop: "1px solid #332b20", borderBottom: "1px solid #332b20", background: "#0d0b09" }}>
        <div
          style={{
            width: "min(1180px, calc(100% - 40px))",
            margin: "0 auto",
            padding: "32px 0",
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: "18px",
          }}
        >
          {[
            ["Business Readiness", "Structured diagnosis and practical priorities."],
            ["Growth Pathways", "Support for positioning, sales, funding readiness and recovery."],
            ["Professional Routing", "Responsible referral where regulated or specialist work is required."],
          ].map(([title, copy]) => (
            <article key={title} style={{ padding: "22px", borderRadius: "20px", border: "1px solid #332b20", background: "#12100d" }}>
              <strong style={{ color: "#f0d88c", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "20px", fontWeight: 500 }}>
                {title}
              </strong>
              <p style={{ color: "#aaa397", margin: "8px 0 0" }}>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
