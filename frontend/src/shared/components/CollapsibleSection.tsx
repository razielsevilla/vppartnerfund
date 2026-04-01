import { useState, type ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export const CollapsibleSection = ({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className={`collapsible-section ${isOpen ? "is-open" : ""}`}>
      <header className="collapsible-section-head">
        <div>
          <h2>{title}</h2>
          {description && <p className="muted">{description}</p>}
        </div>
        <button
          type="button"
          className="secondary-btn collapsible-toggle-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </header>

      {isOpen && <div className="collapsible-section-content">{children}</div>}
    </section>
  );
};
