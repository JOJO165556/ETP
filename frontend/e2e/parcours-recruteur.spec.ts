import { expect, test, type Page } from "@playwright/test";

/*
 * Parcours complet sans appel manuel à l'API :
 *  1. Le recruteur s'inscrit (entreprise créée), publie une offre.
 *  2. Le candidat s'inscrit et postule à l'offre.
 *  3. Le recruteur évalue la candidature et planifie un entretien.
 *  4. Le candidat voit la notification « Entretien programmé » et la marque lue.
 *
 * L'OTP universel "123456" est utilisé (RESEND_API_KEY non configuré en test).
 */

const OTP_TEST = "123456";
const suffixe = Date.now().toString(36);
const TITRE_OFFRE = `Ingénieur Full-Stack E2E ${suffixe}`;

async function inscrire(page: Page, role: "candidate" | "recruiter") {
  await page.goto(role === "recruiter" ? "/register?role=recruiter" : "/register");
  await page.locator("#email").fill(`${role}-${suffixe}@exemple-e2e.fr`);
  await page.locator("#password").fill("MotDePasse!123");
  if (role === "recruiter") {
    await page.locator("#company-name").fill(`Entreprise E2E ${suffixe}`);
  }
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // Étape OTP
  await expect(page.locator("#otp")).toBeVisible({ timeout: 30_000 });
  await page.locator("#otp").fill(OTP_TEST);
  await page.getByRole("button", { name: "Vérifier et continuer" }).click();

  // Attente de la redirection post-vérification
  await page.waitForURL(role === "candidate" ? /\/cv-upload/ : /\/overview/, {
    timeout: 30_000,
  });
}

test("parcours complet : offre → candidature → évaluation → entretien → notification", async ({
  browser,
}) => {
  test.setTimeout(300_000);

  // Recruteur : inscription + publication d'offre
  const contexteRecruteur = await browser.newContext();
  const recruteur = await contexteRecruteur.newPage();
  await inscrire(recruteur, "recruiter");

  await recruteur.goto("/jobs");
  await recruteur.getByRole("button", { name: "Publier une offre" }).click();
  await recruteur.locator("#job-title").fill(TITRE_OFFRE);
  await recruteur.locator("#job-description").fill("Développer et maintenir la plateforme ETP.");
  await recruteur.locator("#job-address").fill("Paris");
  await recruteur.locator("#job-skills").fill("TypeScript, Python, FastAPI");
  await recruteur.getByRole("button", { name: "Publier l'offre" }).click();
  await expect(recruteur.getByText(TITRE_OFFRE)).toBeVisible({ timeout: 30_000 });

  // Candidat : inscription + candidature
  const contexteCandidat = await browser.newContext();
  const candidat = await contexteCandidat.newPage();
  await inscrire(candidat, "candidate");

  await candidat.goto("/jobs");
  await candidat.getByRole("link", { name: new RegExp(TITRE_OFFRE) }).click();
  await candidat.getByRole("button", { name: "Postuler à cette offre" }).click();
  await expect(candidat.getByText(/Candidature envoyée/)).toBeVisible({
    timeout: 30_000,
  });

  // Recruteur : évaluation + planification d'entretien
  await recruteur.goto("/jobs");
  await recruteur.getByRole("link", { name: TITRE_OFFRE }).click();
  await recruteur.waitForURL(/\/jobs\//);

  // Attente de la candidature puis ouverture du panneau d'évaluation
  const boutonEvaluer = recruteur.getByRole("button", { name: "Évaluer" });
  await expect(boutonEvaluer).toBeVisible({ timeout: 30_000 });
  await boutonEvaluer.click();

  // Note 4/5 + commentaire via la modale candidate-rating-modal
  const modaleNote = recruteur.locator("div.fixed.inset-0.z-50", {
    hasText: "Évaluer le candidat",
  });
  await modaleNote.locator("button", { has: recruteur.locator("svg.lucide-star") }).nth(3).click();
  await modaleNote.locator("#content").fill("Bon profil, à convoquer.");
  await modaleNote.getByRole("button", { name: "Enregistrer" }).click();
  await expect(recruteur.getByText("Évaluation enregistrée.")).toBeVisible({
    timeout: 30_000,
  });

  // Vérification GET notes : la note apparaît dans le panneau dépliable
  await recruteur.getByRole("button", { name: "Notes" }).click();
  await expect(recruteur.getByText("Bon profil, à convoquer.")).toBeVisible({
    timeout: 30_000,
  });

  // Planification d'entretien via interview-slot-picker
  await recruteur.getByRole("button", { name: "Entretien" }).click();
  const modaleEntretien = recruteur.locator("div.fixed.inset-0.z-50", {
    hasText: "Planifier un entretien",
  });
  await expect(modaleEntretien).toBeVisible();
  await modaleEntretien.locator("button", { hasText: /\d{2}:\d{2}/ }).first().click();
  await modaleEntretien.getByRole("button", { name: "Confirmer le créneau" }).click();
  await expect(recruteur.getByText("Entretien planifié.")).toBeVisible({
    timeout: 30_000,
  });

  // Candidat : notification reçue, consultation de l'entretien, puis marquage lu
  await candidat.goto("/overview");
  const cloche = candidat.getByRole("button", { name: /Notifications/ });
  await expect(cloche).toBeVisible({ timeout: 30_000 });
  await cloche.click();
  await candidat.getByText("Entretien programmé").click();

  // Le lien de la notification mène à /interviews, accessible au candidat.
  await candidat.waitForURL(/\/interviews/);
  await expect(candidat.getByText(TITRE_OFFRE).first()).toBeVisible({ timeout: 30_000 });

  await candidat.goto("/overview");
  await cloche.click();
  const toutLire = candidat.getByRole("button", { name: "Tout marquer comme lu" });
  try {
    await toutLire.click({ timeout: 5_000 });
  } catch {
    // déjà toutes lues
  }
  // Le badge de non-lues disparaît une fois toutes les notifications lues.
  await expect(cloche).toHaveAttribute("aria-label", "Notifications", {
    timeout: 15_000,
  });

  await contexteCandidat.close();
  await contexteRecruteur.close();
});
