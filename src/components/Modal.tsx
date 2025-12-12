import { ButtonHTMLAttributes, ReactNode, useEffect, useRef, useState } from 'react';
import './Modal.css';

interface ModalButton extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly message: ReactNode,
  readonly callback?: () => void,
  readonly checkboxCallback?: (checked: boolean) => void,
  readonly close?: boolean, // prevent flashes when the button opens another modal
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
  readonly isModal?: boolean,
}

export type ShowModal = (args: ModalArguments) => void;

function Modal({closeCallback, classes, message, buttons, checkbox, cancelCallback, isModal = true}: { closeCallback: () => void } & ModalArguments) {
  const open = message !== undefined;
  const [checkboxChecked, setCheckboxChecked] = useState(checkbox?.checked ?? false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  // Opening/closing the modal
  useEffect(() => {
    const modal = modalRef.current;
    if (modal === null)
      return;

    if (modal.open)
      modal.close();
    if (open) {
      if (isModal)
        modal.showModal();
      else
        modal.show();
    }
  }, [open, isModal]);

  // Autofocus
  useEffect(() => {
    const buttonsElement = buttonsRef.current;
    if (open && buttons && buttonsElement !== null) {
      const autofocusIndex = buttons.findIndex((button) => button.autoFocus);
      if (autofocusIndex !== -1)
        Array.from(buttonsElement.children).filter((child) => child instanceof HTMLButtonElement)[autofocusIndex].focus();
    }
  }, [message, open]);

  const onClick = (callback?: () => void, checkboxCallback?: (checked: boolean) => void, close = true) => (
    () => {
      if (close)
        closeCallback();
      if (callback)
        callback();
      if (checkboxCallback)
        checkboxCallback(checkboxChecked);
    }
  );

  const onCancel = () => {
    if (cancelCallback)
      cancelCallback();
    closeCallback();
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
        buttons?.map(({message, callback, checkboxCallback, close, ...attr}, i) =>
          <button key={i} type="button" onClick={onClick(callback, checkboxCallback, close)} {...attr} >{message}</button>)
      }
    </div>
  </dialog>;
}

export default Modal;
