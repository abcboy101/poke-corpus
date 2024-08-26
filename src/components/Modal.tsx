import { ReactNode, useEffect, useRef, useState } from 'react';
import './Modal.css';

interface ModalButton {
  message: ReactNode,
  callback?: () => void,
  checkboxCallback?: (checked: boolean) => void,
  autoFocus?: boolean,
}

interface ModalCheckbox {
  message: ReactNode,
  checked: boolean,
}

export type ModalArguments = ModalArgumentsInactive | ModalArgumentsActive | ModalArgumentsActiveCheckbox;

export interface ModalArgumentsInactive {
  message?: undefined,
  buttons?: undefined,
  checkbox?: undefined,
}

export interface ModalArgumentsActive {
  message: ReactNode,
  buttons: ModalButton[],
  checkbox?: undefined,
}

export interface ModalArgumentsActiveCheckbox {
  message: ReactNode,
  buttons: ModalButton[],
  checkbox: ModalCheckbox,
}

export type ShowModalArguments = Omit<ModalArgumentsActive | ModalArgumentsActiveCheckbox, 'active'>;

function Modal({message, buttons, checkbox}: ModalArguments) {
  const [open, setOpen] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(checkbox?.checked ?? false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message || buttons || checkbox) {
      setOpen(true);
      setCheckboxChecked(checkbox?.checked ?? false);
    }
  }, [message, buttons, checkbox]);

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

  const onCancel = () => setOpen(false);

  if (!open) {
    return null;
  }
  return <dialog ref={modalRef} id="modal" className="modal" onCancel={onCancel}>
    <div className="modal-message">{message}</div>
    {
      checkbox && <div className="modal-checkbox">
        <div>
          <input type="checkbox" id="modalCheckbox" name="modalCheckbox" checked={checkboxChecked} onChange={(e) => setCheckboxChecked(e.target.checked)}/>
          <label htmlFor="modalCheckbox">{checkbox.message}</label>
        </div>
      </div>
    }
    <div ref={buttonsRef} className="modal-button-group">
      {
        buttons && buttons.map(({message, callback, checkboxCallback, autoFocus}, i) =>
          <button key={i} type="button" onClick={onClick(callback, checkboxCallback)} autoFocus={autoFocus}>{message}</button>)
      }
    </div>
  </dialog>;
}

export default Modal;
