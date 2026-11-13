import ControlledSignUp from "./ControlledSignUp";
import UncontrolledSignUp from "./UncontrolledSignUp";

export default function App() {
  return (
    <>
      <div className="background">
        <div className="neuwo-background__gradient" />
      </div>
      <main className="page">
        <neuwo-logo variant="bg-dark" />
        <h1>Neuwo with React and Vite</h1>
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
      </main>
    </>
  );
}
