"use client";

import { useState } from "react";

const projectTypes = [
  "Commercial Construction",
  "Structural Glazing",
  "Custom Residence",
  "Renovation & Addition",
  "Design-Build",
  "Not sure yet",
];

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="border border-black/15 p-8 sm:p-10">
        <p className="text-2xl font-medium text-black">Thank you.</p>
        <p className="mt-3 text-sm leading-relaxed text-black/70">
          We&apos;ve received your message and will be in touch within one
          business day.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Name" name="name" required />
        <Field label="Email" name="email" type="email" required />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Phone" name="phone" type="tel" />
        <div>
          <label
            htmlFor="projectType"
            className="mb-2 block font-mono text-[0.65rem] tracking-[0.1em] text-black/50 uppercase"
          >
            Project Type
          </label>
          <select
            id="projectType"
            name="projectType"
            className="w-full border-0 border-b border-black/20 bg-transparent py-2 text-black outline-none transition-colors duration-300 focus:border-black"
          >
            {projectTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label
          htmlFor="message"
          className="mb-2 block font-mono text-[0.65rem] tracking-[0.1em] text-black/50 uppercase"
        >
          Tell us about the project
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full resize-none border-0 border-b border-black/20 bg-transparent py-2 text-black outline-none transition-colors duration-300 focus:border-black"
        />
      </div>
      <button
        type="submit"
        className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-black px-6 py-3 font-mono text-[0.7rem] tracking-[0.12em] text-white uppercase transition-colors duration-300 hover:bg-black/80"
      >
        <span aria-hidden>↳</span>
        Send Message
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block font-mono text-[0.65rem] tracking-[0.1em] text-black/50 uppercase"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full border-0 border-b border-black/20 bg-transparent py-2 text-black outline-none transition-colors duration-300 focus:border-black"
      />
    </div>
  );
}
