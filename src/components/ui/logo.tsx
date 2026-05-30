import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/utils";

interface Props {
  variant?: "icon" | "text" | "full";
  className?: string;
  href?: string;
}

const Logo = ({ variant = "icon", className, href = "/" }: Props) => {
  if (variant === "icon") {
    return (
      <BrandLogo
        href={href}
        showWordmark={false}
        size="md"
        className={className}
      />
    );
  }

  return (
    <BrandLogo
      href={href}
      showWordmark={variant === "full" || variant === "text"}
      size="md"
      className={cn(className)}
    />
  );
};

export default Logo;
