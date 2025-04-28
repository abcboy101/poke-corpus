import { ReactNode, useEffect, useRef, useState } from 'react';
import './Modal.css';

interface ModalButton {
  readonly message: ReactNode,
  readonly callback?: () => void,
  readonly checkboxCallback?: (checked: boolean) => void,
  readonly autoFocus?: boolean,
}

interface ModalCheckbox {
  readonly message: ReactNode,
  readonly checked: boolean,
}

export interface ModalArguments {
  readonly classes?: readonly string[],
  readonly message?: ReactNode,
  readonly buttons?: readonly ModalButton[],
  readonly checkbox?: ModalCheckbox,
  readonly cancelCallback?: () => void,
}

export type ShowModal = (args: ModalArguments) => void;

function Modal({classes, message, buttons, checkbox, cancelCallback}: ModalArguments) {
  const [open, setOpen] = useState(message !== undefined);
  const [checkboxChecked, setCheckboxChecked] = useState(checkbox?.checked ?? false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const modal = modalRef.current;
    const buttonsElement = buttonsRef.current;
    if (modal !== null) {
      if (open) {
        modal.showModal();
        if (buttons) {
          const autofocusIndex = buttons.findIndex((button) => button.autoFocus);
          if (buttonsElement !== null && autofocusIndex !== -1)
            Array.from(buttonsElement.children).filter((child) => child instanceof HTMLButtonElement)[autofocusIndex].focus();
        }
      }
      else {
        modal.close();
      }
    }
  }, [open]);

  const onClick = (callback?: () => void, checkboxCallback?: (checked: boolean) => void) => (
    () => {
      setOpen(false);
      if (callback)
        callback();
      if (checkboxCallback)
        checkboxCallback(checkboxChecked);
    }
  );

  const onCancel = () => {
    if (cancelCallback)
      cancelCallback();
    setOpen(false);
  };

  if (!open) {
    return null;
  }

  const dialogClasses = ['modal'];
  if (classes)
    classes.forEach((s) => dialogClasses.push(s));
  return <dialog ref={modalRef} id="modal" className={dialogClasses.join(' ')} onCancel={onCancel}>
    <div className="modal-message">{message}</div>
    {
      checkbox && <div className="modal-checkbox">
        <div>
          <input type="checkbox" id="modalCheckbox" name="modalCheckbox" checked={checkboxChecked} onChange={(e) => { setCheckboxChecked(e.target.checked); }}/>
          <label htmlFor="modalCheckbox">{checkbox.message}</label>
        </div>
      </div>
    }
    <div ref={buttonsRef} className="modal-button-group">
      {
        buttons?.map(({message, callback, checkboxCallback, autoFocus}, i) =>
          <button key={i} type="button" onClick={onClick(callback, checkboxCallback)} autoFocus={autoFocus}>{message}</button>)
      }
    </div>
  </dialog>;
}

export default Modal;
