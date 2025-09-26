import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

type CommentSheetProps = {
  isOpen: boolean;
  comment: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  maxLength?: number;
};

const DESKTOP_HEIGHT = 320;

export function CommentSheet({ isOpen, comment, onChange, onSave, onClose, isSaving, maxLength = 2000 }: CommentSheetProps) {
  const remaining = maxLength - comment.length;

  return (
    <Transition show={isOpen} as={Fragment}>
      <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 pb-6 sm:px-6 lg:px-8">
        <Transition.Child
          enter="transition ease-out duration-200"
          enterFrom="translate-y-6 opacity-0"
          enterTo="translate-y-0 opacity-100"
          leave="transition ease-in duration-150"
          leaveFrom="translate-y-0 opacity-100"
          leaveTo="translate-y-6 opacity-0"
          as={Fragment}
        >
          <div
            className="w-full max-w-[960px] rounded-2xl border border-surfaceAlt bg-surface p-6 shadow-xl"
            style={{ minHeight: DESKTOP_HEIGHT, maxHeight: 360 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-textPrimary">Комментарий</h3>
                <p className="text-xs text-gray-500">Комментарий сохраняется вместе с основными данными.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-surfaceAlt px-2 py-1 text-gray-300 transition hover:border-accentPink/70 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <textarea
              value={comment}
              onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
              className="mt-4 h-40 w-full resize-none rounded-lg border border-surfaceAlt bg-surfaceAlt/80 px-3 py-2 text-sm text-white outline-none focus:border-accentBlue"
              placeholder="Оставьте заметки к товару"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Осталось {remaining >= 0 ? remaining : 0} символов</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-surfaceAlt px-3 py-1 text-gray-300 transition hover:border-accentBlue/70 hover:text-white"
                >
                  Свернуть
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-md bg-accentBlue px-3 py-1 text-white transition hover:bg-blue-600 disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </Transition.Child>
      </div>
    </Transition>
  );
}
