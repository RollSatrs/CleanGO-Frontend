
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

type CleaningCardProps = {
  title: string;
  description: string;
  price: number;
  selected: boolean;
  onClick: () => void;
};

export default function CleaningCard({
  title,
  description,
  price,
  selected,
  onClick,
}: CleaningCardProps) {
  return (
    <Card className={selected ? "border-teal-600 bg-teal-50" : ""}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <p className="mb-4 font-semibold text-teal-700">
          от {price.toLocaleString("ru-RU")} ₸
        </p>

        <Button
          type="button"
          onClick={onClick}
          variant={selected ? "default" : "outline"}
          className="w-full"
        >
          {selected ? "Выбрано ✓" : "Выбрать услугу"}
        </Button>
      </CardContent>
    </Card>
  );
}
