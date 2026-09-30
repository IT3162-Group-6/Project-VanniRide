import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import HeroArt from '../components/HeroArt';

const TRUST = [
  { icon: 'card', label: 'Affordable Fares' },
  { icon: 'user', label: 'Student Riders' },
  { icon: 'shield', label: 'Safe & Reliable' },
  { icon: 'headset', label: 'Fast Support' },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Your <span>Ride.</span><br />
            Your <span>Delivery.</span><br />
            Your Community.
          </h1>
          <p>
            A student-powered transportation and delivery platform for the University of Vavuniya.
          </p>
          <div className="hero-ctas">
            <Link to="/register" className="btn btn-primary">Book a Ride</Link>
            <Link to="/register" className="btn btn-ghost">Send a Delivery</Link>
          </div>

          <div className="trust-row">
            {TRUST.map((t) => (
              <div className="trust-item" key={t.label}>
                <span className="trust-icon"><Icon name={t.icon} size={18} /></span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-art"><HeroArt /></div>
      </section>

      <section className="section" id="services">
        <div className="section-head">
          <div className="section-eyebrow">POPULAR SERVICES</div>
          <h2>One app for getting around campus</h2>
          <p>Whether it's a quick hop to the hostel or a parcel that needs to move fast, Vanni Ride keeps campus moving.</p>
        </div>
        <div className="grid-4">
          <div className="service-card"><div className="fi"><Icon name="bike" /></div><b>Campus to Hostel</b><span>Quick &amp; safe rides</span></div>
          <div className="service-card"><div className="fi"><Icon name="route" /></div><b>Town Rides</b><span>Vavuniya town &amp; more</span></div>
          <div className="service-card"><div className="fi"><Icon name="package" /></div><b>Deliveries</b><span>Medicine, groceries &amp; more</span></div>
          <div className="service-card"><div className="fi"><Icon name="clock" /></div><b>Scheduled Rides</b><span>Book for later</span></div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="section-head">
          <div className="section-eyebrow">WHY CHOOSE VANNI RIDE</div>
          <h2>Built around trust and fair pricing</h2>
        </div>
        <div className="grid-3">
          <div className="feature-card"><div className="fi"><Icon name="user" /></div><h3>Student Community</h3><p>By students, for students — every rider is verified through the university.</p></div>
          <div className="feature-card"><div className="fi"><Icon name="card" /></div><h3>Affordable Fares</h3><p>Transparent, fair pricing for everyone with upfront fare estimates.</p></div>
          <div className="feature-card" id="safety"><div className="fi"><Icon name="shield" /></div><h3>Safety First</h3><p>Verified riders and 24/7 support, every trip of the way.</p></div>
        </div>
      </section>

      <section className="section" id="about">
        <div className="section-head">
          <div className="section-eyebrow">WEB APP FEATURES</div>
          <h2>Everything you need, in one place</h2>
        </div>
        <div className="feature-strip">
          {[
            { icon: 'user', top: 'User', bottom: 'Registration & Login' },
            { icon: 'car', top: 'Ride & Delivery', bottom: 'Requests' },
            { icon: 'pin', top: 'Map-based Location', bottom: 'Selection' },
            { icon: 'card', top: 'Fare', bottom: 'Estimation' },
            { icon: 'clock', top: 'Scheduled', bottom: 'Requests' },
            { icon: 'route', top: 'Request', bottom: 'Tracking' },
            { icon: 'chat', top: 'In-app', bottom: 'Chat' },
            { icon: 'star', top: 'Ratings', bottom: '& Feedback' },
            { icon: 'shield', top: 'Secure', bottom: 'Payments' },
          ].map((f) => (
            <div className="feature-pill" key={f.top + f.bottom}>
              <Icon name={f.icon} size={18} />
              <div><b>{f.top}</b><span>{f.bottom}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="cta-band">
          <div>
            <h2>Become a rider. Earn on your own schedule.</h2>
            <p>Join hundreds of students already earning money delivering and driving around campus.</p>
          </div>
          <Link to="/register" className="btn btn-primary">Join Now</Link>
        </div>
      </section>

      <footer className="footer">© 2026 Vanni Ride — University of Vavuniya. Made for students, by students.</footer>
    </>
  );
}
