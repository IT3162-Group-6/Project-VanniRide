import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import HeroArt from '../components/HeroArt';

const SERVICES = [
  {
    icon: 'bike',
    title: 'Request a ride',
    description: 'Choose pickup and destination points on the map, review the road-route fare, and send your request to available riders.',
    details: ['Road-based route estimate', 'Live status and rider chat'],
  },
  {
    icon: 'package',
    title: 'Send a delivery',
    description: 'Request food, drinking water, or parcel delivery for yourself or another receiver from the same simple flow.',
    details: ['Food, water, and parcel options', 'Receiver details only when needed'],
  },
];

const STEPS = [
  {
    title: 'Create your account',
    description: 'Register as a customer, rider, or both using your @stu.vau.ac.lk student email.',
  },
  {
    title: 'Place your request',
    description: 'Select locations, check the route and cash fare, then confirm the ride or delivery details.',
  },
  {
    title: 'Track it through completion',
    description: 'Follow status updates, chat with the assigned rider, and leave a rating when the request is complete.',
  },
];

const SAFETY_POINTS = [
  { icon: 'shield', title: 'Reviewed rider access', text: 'Riders provide vehicle details and remain offline until an administrator approves them.' },
  { icon: 'route', title: 'Visible request progress', text: 'Customers and riders can follow the same request stages from acceptance through completion.' },
  { icon: 'bell', title: 'Relevant alerts', text: 'In-app notifications surface new requests, messages, cancellations, and status changes.' },
  { icon: 'star', title: 'History and feedback', text: 'Completed requests stay in history and customers can submit a rider rating or skip it.' },
];

export default function Home() {
  return (
    <>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-kicker"><Icon name="pin" size={15} /> University of Vavuniya community transport</span>
          <h1>Campus rides and essential deliveries, <span>in one place.</span></h1>
          <p>Request transport or arrange food, water, and parcel deliveries with student riders serving the university community.</p>
          <div className="hero-ctas">
            <Link to="/register" className="btn btn-primary">Create an account</Link>
            <Link to="/login" className="btn btn-outline-soft">Log in</Link>
          </div>
          <div className="landing-hero-notes" aria-label="Service highlights">
            <span><Icon name="route" size={16} /> Route-based fares</span>
            <span><Icon name="chat" size={16} /> In-app chat</span>
            <span><Icon name="card" size={16} /> Cash payment</span>
          </div>
        </div>
        <div className="landing-visual">
          <HeroArt />
          <div className="landing-visual-card">
            <span className="landing-visual-icon"><Icon name="bike" size={19} /></span>
            <span><b>Ride or delivery</b><small>Choose the service you need</small></span>
          </div>
        </div>
      </section>

      <section className="landing-section" id="services">
        <header className="landing-section-head">
          <span>Services</span>
          <h2>Start with what you need today</h2>
          <p>Vanni Ride keeps the first decision simple: move yourself, or send something to someone.</p>
        </header>
        <div className="landing-service-grid">
          {SERVICES.map((service) => (
            <article className="landing-service-card" key={service.title}>
              <div className="landing-service-icon"><Icon name={service.icon} size={25} /></div>
              <div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul>{service.details.map((detail) => <li key={detail}><Icon name="check" size={15} /> {detail}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-how" id="how">
        <header className="landing-section-head">
          <span>How it works</span>
          <h2>From sign-up to arrival</h2>
        </header>
        <div className="landing-steps">
          {STEPS.map((step, index) => (
            <article className="landing-step" key={step.title}>
              <span className="landing-step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="safety">
        <div className="landing-safety-panel">
          <div className="landing-safety-copy">
            <span>Built-in safeguards</span>
            <h2>Clear controls for customers and riders</h2>
            <p>The application focuses on visibility and accountable access throughout each request.</p>
            <Link to="/register" className="btn btn-primary">Get started</Link>
          </div>
          <div className="landing-safety-list">
            {SAFETY_POINTS.map((point) => (
              <article key={point.title}>
                <span><Icon name={point.icon} size={20} /></span>
                <div><h3>{point.title}</h3><p>{point.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" id="riders">
        <div className="landing-rider-callout">
          <div className="landing-rider-icon"><Icon name="bike" size={30} /></div>
          <div>
            <span>For student riders</span>
            <h2>Use one account for both panels</h2>
            <p>Register for customer and rider access with the same student email. Rider access becomes available after vehicle review and administrator approval.</p>
          </div>
          <Link to="/register" className="btn btn-primary">Register as a rider</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="brand"><span className="brand-mark"><Icon name="pin" size={20} /></span> Vanni <b>Ride</b></div>
        <p>Campus transport and delivery for the University of Vavuniya community.</p>
        <span>© 2026 Vanni Ride</span>
      </footer>
    </>
  );
}
