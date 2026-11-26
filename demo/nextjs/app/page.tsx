import ControlledSignUp from "./controlled-sign-up";
import UncontrolledSignUp from "./uncontrolled-sign-up";

export default function Page() {
  return (
    <>
      <h1>Neuwo with React and Next.js</h1>
      <p>
        Two sign-up forms built from the library's elements. The first keeps its values in React state; the second
        lets the fields hold them and reads the form on submit.
      </p>
      <div className="forms">
        <section>
          <h2>Controlled</h2>
          <ControlledSignUp />
        </section>
        <section>
          <h2>Uncontrolled</h2>
          <UncontrolledSignUp />
        </section>
      </div>
    </>
  );
}
