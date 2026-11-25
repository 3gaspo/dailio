import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ListChecks, Sprout } from 'lucide-react';
import { ActionButton } from '@3gaspo/app-ui/ActionButton';
import type { Category, Habit, Periodicity, StarterHabit } from '../types';
import { getCategoryColor, getContrastColor } from '../utils/categoryUtils';
import { starterSuggestions } from '../utils/starterHabits';
import { Dialog, DialogActions } from './Dialog';

const periods: readonly { id: Periodicity; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
];

export function StarterHabitsDialog({ categories, habits, onComplete }: {
  categories: readonly Category[];
  habits: readonly Habit[];
  onComplete: (selected: readonly StarterHabit[]) => Promise<void>;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const closeAlert = useRef<HTMLParagraphElement>(null);
  const saving = useRef(false);
  const [review, setReview] = useState(false);
  const [dog, setDog] = useState<boolean | null>(null);
  const [sport, setSport] = useState('');
  const [instrument, setInstrument] = useState('');
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [closeError, setCloseError] = useState(false);

  const suggestions = starterSuggestions({ dog: dog === true, sport, instrument }, categories, habits);
  const isSelected = (item: (typeof suggestions)[number]) => choices[item.key] ?? true;
  const selected = suggestions.filter(isSelected).map(item => item.habit);
  const StepIcon = review ? ListChecks : Sprout;

  useLayoutEffect(() => {
    const body = heading.current?.closest('.app-dialog-body');
    if (body) body.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [review]);

  useLayoutEffect(() => {
    if (closeError) {
      closeAlert.current?.focus({ preventScroll: true });
      closeAlert.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [closeError]);

  async function finish(selection: readonly StarterHabit[]) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setCloseError(false);
    try {
      await onComplete(selection);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function close() {
    void finish([]).catch(() => setCloseError(true));
  }

  return (
    <Dialog open busy={busy} title="Starter habits" onClose={close}>
      <div className="app-tutorial-page">
        <div className="app-tutorial-page-top">
          <span className="app-tutorial-icon"><StepIcon size={24} aria-hidden="true" /></span>
          <span className="ui-meta">Step {review ? 2 : 1} of 2</span>
        </div>
        <h3 ref={heading} tabIndex={-1} className="app-tutorial-page-title focus:outline-none">
          {review ? 'Choose your habits' : 'Tell us about your routine'}
        </h3>
        {closeError && (
          <p ref={closeAlert} className="ui-error mb-4" role="alert" tabIndex={-1}>
            Could not skip setup. Try again.
          </p>
        )}
        {review ? (
          <fieldset disabled={busy} className="grid min-w-0 gap-4">
            <p className="app-tutorial-description">
              {suggestions.length ? 'Pick habits to add. You will be able to edit them in the app.' : 'There are no new suggestions for these answers.'}
            </p>
            {periods.map(({ id, label }) => {
              const items = suggestions.filter(item => item.habit.periodicity === id);
              if (!items.length) return null;
              return (
                <section key={id} aria-label={label}>
                  <h4 className="ui-section-title mb-1">{label}</h4>
                  <ul className="space-y-1">
                    {items.map(item => {
                      const colour = getCategoryColor(item.category);
                      return (
                        <li key={item.key}>
                          <label className="ui-item-card grid min-h-11 cursor-pointer grid-cols-[auto_minmax(0,1fr)_minmax(0,4.5rem)] items-center gap-2 px-2 py-1 text-sm">
                            <input
                              type="checkbox"
                              className="size-4 accent-[var(--ui-ink)]"
                              checked={isSelected(item)}
                              onChange={event => setChoices({ ...choices, [item.key]: event.target.checked })}
                              aria-label={item.habit.name}
                            />
                            <span className="min-w-0">{item.habit.name}</span>
                            {item.category && (
                              <span className="habit-category justify-self-end" title={item.category.name}
                                style={{ backgroundColor: colour, color: getContrastColor(colour) }}>
                                {item.category.name}
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </fieldset>
        ) : (
          <form id={id} onSubmit={event => { event.preventDefault(); setReview(true); }}>
            <fieldset disabled={busy} className="min-w-0 space-y-3">
              <div role="group" aria-labelledby={`${id}-dog`}>
                <p id={`${id}-dog`} className="ui-field-label mb-1">Do you have a dog?</p>
                <div className="ui-segments">
                  <button type="button" className="ui-option" aria-pressed={dog === true} onClick={() => setDog(true)}>Yes</button>
                  <button type="button" className="ui-option" aria-pressed={dog === false} onClick={() => setDog(false)}>No</button>
                </div>
              </div>
              <label className="block space-y-1">
                <span className="ui-field-label">What sport do you practise?</span>
                <input className="ui-field w-full" value={sport} onChange={event => setSport(event.target.value)} placeholder="e.g. Swimming" />
              </label>
              <label className="block space-y-1">
                <span className="ui-field-label">What instrument do you play?</span>
                <input className="ui-field w-full" value={instrument} onChange={event => setInstrument(event.target.value)} placeholder="e.g. guitar" />
              </label>
            </fieldset>
          </form>
        )}
      </div>
      <DialogActions form={id}>
        {review ? (
          <>
            <button type="button" className="ui-button ui-button-secondary" onClick={() => setReview(false)}>Back</button>
            <ActionButton className="ui-button ui-button-primary" onClick={() => finish(selected)}>
              {selected.length ? 'Add habits' : 'Finish setup'}
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton className="ui-button ui-button-secondary" onClick={() => finish([])}>Skip</ActionButton>
            <button type="submit" className="ui-button ui-button-primary">Next</button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
