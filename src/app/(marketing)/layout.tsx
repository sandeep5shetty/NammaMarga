import { SiteBackground } from "@/components/marketing/site-background";
import { Footer, Navbar } from "@/components";

interface Props {
    children: React.ReactNode
}

const MarketingLayout = ({ children }: Props) => {
    return (
        <div className="relative min-h-screen">
            <SiteBackground />
            <div className="relative z-10 flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1 mt-16 md:mt-20 mx-auto w-full">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default MarketingLayout
