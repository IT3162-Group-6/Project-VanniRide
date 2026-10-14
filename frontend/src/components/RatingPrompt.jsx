import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/authStore';
import { useAppState } from '../context/appStateStore';
import { useRealtimeEvent } from '../context/realtimeHooks';
import { ridesApi } from '../services/api';
import { findRatingPromptRide } from '../utils/ratingPrompt';
import Icon from './Icon';

const dismissedStorageKey = (userId) => `vr_rating_prompt_dismissed_${userId}`;

const readDismissed = (userId) => {
  try {
    const value = JSON.parse(localStorage.getItem(dismissedStorageKey(userId)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const rememberDismissed = (userId, rideId) => {
  try {
    const dismissed = new Set(readDismissed(userId));
    dismissed.add(rideId);
    localStorage.setItem(dismissedStorageKey(userId), JSON.stringify([...dismissed].slice(-50)));
  } catch {
    // The dialog can still close when browser storage is unavailable.
  }
};

export default function RatingPrompt() {
  const { user } = useAuth();
  const { showToast } = useAppState();
  const [ride, setRide] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const findPendingRide = useCallback(async (preferredRideId = null) => {
    if (user?.role !== 'customer') return;
    try {
      const history = await ridesApi.history();
      const pendingRide = findRatingPromptRide(
        history.rides,
        readDismissed(user.id),
        preferredRideId
      );
      if (pendingRide) setRide(pendingRide);
    } catch {
      // Rating remains available from ride history if this optional prompt cannot load.
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void findPendingRide(), 0);
    return () => window.clearTimeout(timer);
  }, [findPendingRide]);

  useRealtimeEvent('ride_status_changed', (event) => {
    if (event.status === 'COMPLETED') void findPendingRide(event.rideId);
  });

  useEffect(() => {
    if (!ride) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !busy) {
        rememberDismissed(user.id, ride.id);
        setRide(null);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [busy, ride, user?.id]);

  const close = () => {
    rememberDismissed(user.id, ride.id);
    setRide(null);
    setRating(0);
    setReview('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) {
      setError('Choose a rating from 1 to 5.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await ridesApi.rate(ride.id, { rating, review });
      rememberDismissed(user.id, ride.id);
      setRide(null);
      setRating(0);
      setReview('');
      showToast('Thank you for rating your rider');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ride || user?.role !== 'customer') return null;

  return (
    <div className="modal-backdrop rating-modal-backdrop" role="presentation">
      <section className="rating-modal" role="dialog" aria-modal="true" aria-labelledby="rating-title">
        <button type="button" className="rating-modal-close" aria-label="Skip rating" disabled={busy} onClick={close}>
          <Icon name="close" size={18} />
        </button>
        <span className="rating-modal-icon"><Icon name="star" size={25} /></span>
        <h2 id="rating-title">How was your {ride.type === 'delivery' ? 'delivery' : 'ride'}?</h2>
        <p>Rate your experience with {ride.rider.name}. You can skip this and rate later from Ride History.</p>
        <form onSubmit={submit}>
          <div className="rating-modal-stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value === 1 ? '' : 's'}`}
                className={rating >= value ? 'selected' : ''}
                key={value}
                onClick={() => setRating(value)}
              >★</button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="rating-review">Review <span className="muted">(optional)</span></label>
            <textarea
              id="rating-review"
              maxLength={1000}
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="Tell us about your experience"
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="rating-modal-actions">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>Not now</button>
            <button type="submit" className="btn btn-primary" disabled={busy || !rating}>
              {busy ? 'Submitting…' : 'Submit rating'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
