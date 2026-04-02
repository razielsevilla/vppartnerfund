import { useEffect, type ReactNode } from "react";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  modalClassName?: string;
  bodyClassName?: string;
};

export const Modal = ({
  title,
  open,
  onClose,
  children,
  modalClassName,
  bodyClassName,
}: ModalProps) => {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={modalClassName ? `ui-modal ${modalClassName}` : "ui-modal"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-head">
          <h2>{title}</h2>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className={bodyClassName ? `ui-modal-body ${bodyClassName}` : "ui-modal-body"}>{children}</div>
      </div>
    </div>
  );
};
