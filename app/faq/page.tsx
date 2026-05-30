const faqs = [
  {
    question: "What comes inside a SPLATT. kit?",
    answer: "Each box includes the blank figurine, selected paint colors, mixing cups, a brush, a plate, and simple instructions."
  },
  {
    question: "Can I choose my colors?",
    answer: "Yes. Pick up to three colors on the product page before adding the figurine to your cart."
  },
  {
    question: "How long does delivery take?",
    answer: "Most orders are prepared after confirmation on WhatsApp. Delivery timing depends on the city and current production queue."
  },
  {
    question: "Do you accept custom figurines?",
    answer: "Yes, when production capacity allows it. Contact us with the model or idea and we will confirm if it is possible."
  },
  {
    question: "Can I track my order?",
    answer: "Yes. Use the Track Order page with your phone number and order ID to see the current status."
  }
];

export default function FaqPage() {
  return (
    <main className="container-page py-14">
      <section className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-splatt-pink">FAQs</p>
        <h1 className="mt-3 font-space text-5xl font-black text-white">Before you pour.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/55">Quick answers for colors, kits, delivery, and custom SPLATT. orders.</p>
      </section>
      <section className="mx-auto mt-10 grid max-w-4xl gap-4">
        {faqs.map((faq) => (
          <article key={faq.question} className="glass p-5">
            <h2 className="font-space text-2xl font-black text-white">{faq.question}</h2>
            <p className="mt-2 text-white/60">{faq.answer}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
