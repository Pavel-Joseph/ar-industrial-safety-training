import TrainingModuleCard from "../components/TrainingModuleCard.jsx";

export default function AboutUs() {
  return (
    <>
      <div className="about-hero">
        <div>
          <h1>Training that survives contact with the real hazard.</h1>
          <p className="lede">
            Site Command is the administrator's view into the AR Industrial Safety Training
            Platform — a phone-camera training and assessment system built for workers on
            fire-, gas- and confined-space-risk sites.
          </p>
        </div>
        <div className="stat-strip">
          <div className="stat-strip__item">
            <div className="stat-strip__num">2</div>
            <div className="stat-strip__label">Required AR modules</div>
          </div>
          <div className="stat-strip__item">
            <div className="stat-strip__num">3</div>
            <div className="stat-strip__label">Languages: English, Hindi, Santali</div>
          </div>
          <div className="stat-strip__item">
            <div className="stat-strip__num">100%</div>
            <div className="stat-strip__label">Works offline on site</div>
          </div>
        </div>
      </div>

      <div className="about-copy">
        <p>
          Workers put on a phone or tablet camera and walk through a real hazard scenario overlaid
          on their actual surroundings — identifying exits, handling a fire extinguisher, or
          recognising a hazard zone before ever facing it for real. Every action is timed and
          scored, so an administrator can see not just who trained, but who is actually ready.
        </p>
        <h2>Why AR, not a slideshow</h2>
        <p>
          Reading about an evacuation route and walking one while equipment reacts to your
          movement are different kinds of learning. AR keeps the training physical — the phone
          camera turns the worker's own corridor, mine face or plant floor into the training
          ground, so the muscle memory formed here transfers directly to the job.
        </p>
        <h2>Built for the site, not the office</h2>
        <p>
          Every module works fully offline once downloaded, runs on low- and mid-range Android
          devices with low-poly assets, and syncs results the moment a connection returns —
          duplicate-safe, so a queued result never appears twice on this dashboard.
        </p>
      </div>

      <h2 style={{ marginTop: 40, marginBottom: 16 }}>Training modules</h2>
      <div className="module-grid">
        <TrainingModuleCard
          tone="fire"
          code="FIRE"
          title="Fire and Explosion Response"
          description="Exit identification, extinguisher selection and use, and evacuation sequencing, overlaid on the worker's real surroundings."
          points={["Locate and confirm the nearest safe exit", "Select and operate the correct extinguisher", "Sequence a full-floor evacuation under time pressure"]}
        />
        <TrainingModuleCard
          tone="gas"
          code="GAS"
          title="Gas Leak and Confined Space Protocol"
          description="Hazard-zone recognition, PPE selection and buddy-system procedure, simulated in AR before a worker ever enters a confined space."
          points={["Recognise a hazard zone from early gas indicators", "Select and verify correct PPE before entry", "Follow buddy-system check-in and exit procedure"]}
        />
      </div>
    </>
  );
}
