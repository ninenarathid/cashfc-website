import AquaDesk from "@/components/AquaDesk";

export const metadata = { title: "Aqua — Cafe And SHabu" };

/**
 * Aqua's page, split out of the admin panel.
 *
 * The prize tab is where the cupboard is set up and every admin works; this
 * is the part of it that is Aqua's alone to worry about, which is the gil. It
 * gets a page of its own so it can be read in one go rather than found
 * halfway down a tab.
 */
export default function AquaPage() {
  return <AquaDesk />;
}
