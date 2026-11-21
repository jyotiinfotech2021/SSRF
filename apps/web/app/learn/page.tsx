import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { get, me, isEditor, type Quiz } from "@/lib/api";
import { Unavailable } from "@/components/ui";
import QuizApp from "@/components/QuizApp";
import { HeroMap, MiniMap, MeghnaMap, LCAMPS } from "@/components/LearnMaps";

export const metadata: Metadata = pageMeta("Learning Centre: the story of Lt Gen Sagat Singh", "Learn the story of Lt Gen Sagat Singh: four chapters, historical evidence to read for yourself, a quiz, classroom material and resources for teachers.", "/learn");
type SP = { searchParams: Promise<{ lvl?: string; topic?: string }> };
const NATCOL: Record<string, string> = { "Primary source": "#762633", "Secondary research": "#3d5a80" };

export default async function Learn({ searchParams }: SP) {
  const sp = await searchParams;
  const lv = sp.lvl === "adv" ? "adv" : "school";
  const [quiz, who] = await Promise.all([get<Quiz[]>("/api/quiz"), me()]);
  const qn = (t: string) => (quiz ?? []).filter((q) => q.topic === t).length;
  return (
    <>
      <section className="lclanding">
        <div className="llanding-inner lchead">
          <div>
            <p className="eyebrow">SSRF Learning Centre</p>
            <h1>Learn the story of Lt Gen Sagat Singh</h1>
            <p>For students, teachers and anyone meeting his story for the first time: four campaigns, a quiz, classroom resources, and real historical evidence to read for yourself.</p>
            <div className="entry"><a className="btn" href="#quiz">Take the quiz</a><a className="btn ghost" href="#l-camps">Explore the campaigns</a><a className="btn ghost" href="#l-teach">For teachers</a></div>
          </div>
          <HeroMap />
        </div>
      </section>
      {!quiz && <Unavailable />}

      <h2 className="sect" id="l-camps">His story in four chapters</h2>
      <div className="lcgrid">
        {LCAMPS.map((c, i) => (
          <article className="lccard" key={c.k}>
            <div className="lccard-map"><MiniMap pin={c.pin} /><span className="lcyr">{c.yr}</span><span className="lcnum">{i + 1}</span></div>
            <div className="lccard-body">
              <h3>{c.t}</h3>
              <ul>{c.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              <p className="lcq"><b>Think about it:</b> {c.q}</p>
              <div className="actions">
                <Link href={c.go[0]}>Read the full {c.go[1] ? "campaign" : "biography"} ›</Link>
                {qn(c.k) > 0 && <Link className="link" href={`/learn?topic=${c.k}#quiz`}>Quiz: {qn(c.k)} questions</Link>}
              </div>
            </div>
          </article>))}
      </div>

      <h2 className="sect" id="l-evidence">Learn through historical evidence</h2>
      <p className="prose">Historians build the story from evidence. Each card below shows one piece, says what kind of evidence it is, and asks you a question about it.</p>
      <div className="evgrid">
        <article className="evcard doc">
          <p className="evkind"><span className="snat" style={{ "--nc": NATCOL["Secondary research"] } as React.CSSProperties}>Document extract</span> Official history, 1974</p>
          <blockquote>&quot;It will be remembered that two battalions from the 50th Para Brigade were engaged on the 18th in a race for Panjim. ... So the 2 Sikh Light Infantry won the race and were first in Panjim.&quot;</blockquote>
          <p className="evsrc">P N Khera, <i>Operation Vijay</i>, Historical Section, Ministry of Defence, 1974, pp. 82–83. <a href="https://archive.org/stream/in.ernet.dli.2015.65754/2015.65754.Operation-Vijay-The-Liberation-Of-Goa-And-Other-Portuguese-Colonies-In-India_djvu.txt" target="_blank" rel="noopener noreferrer">Read the full text ↗</a></p>
          <p className="evq"><b>Ask:</b> The writer was not in Goa. How could he know this? What records might he have used?</p>
        </article>
        <article className="evcard map">
          <p className="evkind"><span className="snat" style={{ "--nc": "#3d5a80" } as React.CSSProperties}>Map</span> The Meghna crossing, 1971</p>
          <div className="evmap"><MeghnaMap /></div>
          <p className="evq"><b>Ask:</b> The bridge at Bhairab Bazar was destroyed. Trace on the map how the helicopters solved the problem.</p>
        </article>
        <article className="evcard rec">
          <p className="evkind"><span className="snat" style={{ "--nc": NATCOL["Primary source"] } as React.CSSProperties}>Official record</span> Raj Bhavan, Sikkim, 11 September 2025</p>
          <blockquote>The Governor unveiled a statue of Lt Gen Sagat Singh, who &quot;led the Indian Army during the confrontation, displaying exceptional courage, leadership, and strategic acumen.&quot;</blockquote>
          <p className="evsrc">Release of Raj Bhavan, Sikkim, on the 59th Nathula Vijay Diwas. <a href="https://rajbhavansikkim.gov.in/?p=17216" target="_blank" rel="noopener noreferrer">Read the release ↗</a></p>
          <p className="evq"><b>Ask:</b> This was written 58 years after the events. Is it evidence of what happened in 1967, or of how he is remembered today?</p>
        </article>
        <article className="evcard photo">
          <p className="evkind"><span className="snat" style={{ "--nc": NATCOL["Primary source"] } as React.CSSProperties}>Photographs</span> From the digital archive</p>
          <p>Photographs from his campaigns and family life are being catalogued in the foundation&apos;s archive. Each one will carry its date, origin and credit, so students can ask who took it, when and why.</p>
          <p className="evq"><b>Ask:</b> What can a photograph tell you that a written record cannot? What can it hide?</p>
          <div className="actions"><Link href="/archive">Open the digital archive ›</Link></div>
        </article>
      </div>

      <h2 className="sect" id="quiz-h">Quiz</h2>
      <div id="quiz"><QuizApp all={quiz ?? []} editor={isEditor(who)} initialTopic={sp.topic} /></div>

      <h2 className="sect">Learning material</h2>
      <div className="lvtabs" role="tablist">
        <Link role="tab" aria-selected={lv === "school"} className={`lvtab${lv === "school" ? " on" : ""}`} href="/learn?lvl=school#learning-material"><b>For schools</b><span>Classes 6 to 10</span></Link>
        <Link role="tab" aria-selected={lv === "adv"} className={`lvtab${lv === "adv" ? " on" : ""}`} href="/learn?lvl=adv#learning-material"><b>Advanced study</b><span>Classes 11 to 12, college and researchers</span></Link>
      </div>
      <div className="lvpanel" id="learning-material">
        {lv === "school" ? (
          <>
            <h3>His life, told simply</h3>
            <p className="prose">Sagat Singh was born in a village in the Rajasthan desert in 1919. He joined the army of Bikaner State as a young man and fought in the Second World War. After Independence he became an officer of the Indian Army and joined the Gorkha Rifles.</p>
            <p className="prose">In 1961 he led paratroopers into Goa, which had been ruled by Portugal for 451 years. In 1967, in the mountains of Sikkim, his division held the pass of Nathu La when Chinese troops attacked. In 1971 he took his corps across the wide Meghna river by helicopter and helped end the war that created Bangladesh. He died in 2001.</p>
            <h3>Talk about it</h3>
            <ul className="prose"><li>Why do you think he was trusted with paratroopers in 1961?</li><li>What might have happened at Nathu La if the pass had been given up?</li><li>How did helicopters help his soldiers cross the Meghna?</li></ul>
            <h3>Activities</h3>
            <ul className="prose"><li>On a blank map of India and Bangladesh, mark Bikaner, Goa, Nathu La and the Meghna river.</li><li>Write a short diary entry by a soldier in 2 Sikh Light Infantry on the day they reached Panjim.</li><li>Find out whether your town has a memorial to a soldier from 1961, 1967 or 1971.</li></ul>
          </>
        ) : (
          <>
            <h3>Questions on leadership</h3>
            <ul className="prose"><li>A commander should sometimes act beyond his orders. Agree or disagree, using the Meghna crossing. The famous telephone exchange with his superior is an unconfirmed account; build your argument without it.</li><li>Holding Nathu La in 1965 was worth the risk of a wider conflict. Discuss.</li><li>Why was a parachute brigade given to an infantry officer in 1961, and what did that choice achieve?</li></ul>
            <h3>Research assignments</h3>
            <ul className="prose"><li>Choose an entry on the Biography or Campaign pages marked &quot;Single source&quot;. Find a second source that confirms or corrects it, and send it through &quot;Suggest a correction&quot;.</li><li>Compare the official history of Operation Vijay (1974) with the biography <i>A Talent for War</i> (2013) on the race to Panjim. Where do they agree?</li><li>Compare two videos about the Meghna crossing in the Videos section. Where do they differ from the campaign page, and which is better supported?</li><li>Find a memorial, road or institution named after a soldier from 1961, 1967 or 1971, and document it for the Recognition register.</li></ul>
            <h3>Working with sources</h3>
            <p className="prose">The <Link href="/sources">Sources</Link> page classifies every source as primary, oral history, family testimony, secondary research or tertiary. Use these categories in your own bibliography, and say for each claim what kind of evidence supports it.</p>
          </>
        )}
      </div>

      <h2 className="sect" id="l-teach">For teachers</h2>
      <div className="tgrid">
        <a className="tcard" href="/learn/ssrf-teachers-guide.pdf" download="ssrf-teachers-guide.pdf"><span className="tic">PDF</span><b>Teacher&apos;s guide</b><span>A 45-minute lesson plan, learning objectives, timeline, discussion questions for two age groups and further reading.</span><em>Download ↓</em></a>
        <a className="tcard" href="/learn/ssrf-classroom-slides.pdf" download="ssrf-classroom-slides.pdf"><span className="tic">PDF</span><b>Classroom slides</b><span>Ten slides for a classroom screen: his life, the three campaigns, a source to read together and a class activity.</span><em>Download ↓</em></a>
        <div className="tcard plain"><span className="tic">Q</span><b>Teacher mode in the quiz</b><span>One question at a time on the classroom screen, no scoring, answers revealed when you choose. Tick &quot;Teacher mode&quot; before starting the quiz.</span></div>
      </div>
      <p className="meta">Students under 18 should not create their own accounts; school use runs through a teacher&apos;s account. The resources are free to copy for classroom use.</p>
    </>
  );
}
