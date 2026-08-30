import React from "react";

export default function RedesignedHome() {
  return (
    <section className="flex flex-col gap-3 max-w-5xl mx-auto min-h-screen p-4">
      <header className="grid grid-cols-3 items-center justify-between p-3 px-4 bg-card rounded-md">
        <span className="logo text-3xl">DocoPilot</span>
        <div></div>
        <div className="">User Avatar</div>
      </header>
      <main className="flex flex-1 h-full gap-3">
        <aside className="min-w-60 bg-card rounded-md p-3">
          <ul>
            <NavLink active={true}>Dashboard</NavLink>
            <NavLink>Containers</NavLink>
            <NavLink>Images</NavLink>
            <NavLink>Volumes</NavLink>
          </ul>
        </aside>
        <div className="bg-card rounded-md flex-1 p-3">Main content</div>
      </main>
    </section>
  );
}

function NavLink({ children, active }) {
  if (active) {
    return <li className="py-2 px-2">{children}</li>;
  }
  return <li className="py-2 px-2">{children}</li>;
}
