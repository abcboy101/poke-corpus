import { ButtonHTMLAttributes, ReactElement, useContext, useEffect, useRef, useState } from 'react';
import { TFunction, TOptions } from 'i18next';

import './Modal.css';
import LocalizationContext from './LocalizationContext';

type TKey = Parameters<TFunction>[0];

interface ModalButton extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly message: TKey,
  readonly callback?: () => void,
  readonly checkboxCallback?: (checked: boolean) => void,
  readonly close?: boolean, // prevent flashes when the button opens another modal
}

interface ModalCheckbox {
  readonly message: TKey,
  readonly checked: boolean,
}

export interface ModalArguments {
  readonly classes?: readonly string[],
  readonly message?: TKey,
  readonly messageOptions?: TOptions,
  readonly messageElement?: ReactElement,
  readonly buttons?: readonly ModalButton[],
  readonly checkbox?: ModalCheckbox,
  readonly cancelCallback?: () => void,
  readonly isModal?: boolean,
}

export type ShowModal = (args: ModalArguments) => void;

type ModalClickHandlerFactory = (callback?: () => void, checkboxCallback?: (checked: boolean) => void, close?: boolean) => () => void;

function Modal({closeCallback, classes, message = '', messageOptions, messageElement, buttons, checkbox, cancelCallback, isModal = true}: { closeCallback: () => void } & ModalArguments) {
  const t = useContext(LocalizationContext);
  const open = (messageElement ?? message) !== '';
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
  }, [messageElement, open]);

  const onClick: ModalClickHandlerFactory = (callback, checkboxCallback, close = true) => (
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

  const modalMessage = <div className="modal-message">{ messageElement ?? t(message, messageOptions) }</div>;
  const modalCheckbox = checkbox && (
    <div className="modal-checkbox">
      <div>
        <input type="checkbox" id="modalCheckbox" name="modalCheckbox" checked={checkboxChecked}
          onChange={(e) => { setCheckboxChecked(e.target.checked); }}/>
        <label htmlFor="modalCheckbox">{t(checkbox.message)}</label>
      </div>
    </div>
  );
  const modalButtons = (
    <div ref={buttonsRef} className="modal-button-group">
      {
        buttons?.map(({message: message, callback, checkboxCallback, close, ...attr}: ModalButton, i) =>
          <button key={i} type="button" onClick={onClick(callback, checkboxCallback, close)} {...attr} >{t(message)}</button>
        )
      }
    </div>
  );

  const dialogClasses = ['modal'];
  if (classes)
    classes.forEach((s) => dialogClasses.push(s));
  return <dialog ref={modalRef} id="modal" className={dialogClasses.join(' ')} onCancel={onCancel}>
    { modalMessage }
    { modalCheckbox }
    { modalButtons }
  </dialog>;
}

export default Modal;
