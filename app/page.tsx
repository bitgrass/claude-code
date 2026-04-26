import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { HeroCover } from "@/components/HeroCover";
import { ThesisSection } from "@/components/ThesisSection";
import { CapacitySection } from "@/components/CapacitySection";
import { MacroMicroSection } from "@/components/MacroMicroSection";
import { OperatingArchitecture } from "@/components/OperatingArchitecture";
import { CounterpartySection } from "@/components/CounterpartySection";
import { EnvironmentalWork } from "@/components/EnvironmentalWork";
import { PrinciplesSection } from "@/components/PrinciplesSection";
import { IdentityRegister } from "@/components/IdentityRegister";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <>
      <InstitutionalHeader />
      <main>
        <HeroCover />
        <ThesisSection />
        <CapacitySection />
        <MacroMicroSection />
        <OperatingArchitecture />
        <CounterpartySection />
        <EnvironmentalWork />
        <PrinciplesSection />
        <IdentityRegister />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
