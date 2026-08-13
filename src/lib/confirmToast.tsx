import toast from 'react-hot-toast';

// Destructive-action confirmation via react-hot-toast (project rule: no
// window.confirm / alert). Shows Delete/Cancel buttons on a persistent toast;
// `onConfirm` runs only if the user clicks Delete.
export function confirmToast(message: string, onConfirm: () => void) {
  toast((t) => (
    <div className="flex flex-col gap-2">
      <span className="text-sm">{message}</span>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={() => { toast.dismiss(t.id); onConfirm(); }}
          className="px-3 py-1 text-sm rounded bg-red-600 text-white font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  ), { duration: Infinity });
}
