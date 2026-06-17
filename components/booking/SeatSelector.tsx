"use client";

interface Seat {
  seat_number: number;
  status: string;
}

interface Props {
  seats: Seat[];
  selected: number[];
  onChange: (seats: number[]) => void;
  maxSeats?: number;
}

export default function SeatSelector({ seats, selected, onChange, maxSeats = 4 }: Props) {
  function toggle(seatNum: number, available: boolean) {
    if (!available) return;
    if (selected.includes(seatNum)) {
      onChange(selected.filter((s) => s !== seatNum));
    } else if (selected.length < maxSeats) {
      onChange([...selected, seatNum].sort((a, b) => a - b));
    }
  }

  if (seats.length === 0) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: maxSeats }, (_, i) => {
          const num = i + 1;
          const isSelected = selected.includes(num);
          return (
            <button
              key={num}
              type="button"
              onClick={() => toggle(num, true)}
              className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition ${
                isSelected ? "border-primary bg-primary/10 text-primary" : "border-gray-200 hover:border-primary/50"
              }`}
            >
              Seat {num}
              <span className="block text-xs text-gray-400 mt-0.5">Available</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {seats.map((seat) => {
        const available = seat.status === "available";
        const isSelected = selected.includes(seat.seat_number);
        return (
          <button
            key={seat.seat_number}
            type="button"
            disabled={!available}
            onClick={() => toggle(seat.seat_number, available)}
            className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition ${
              !available
                ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                : isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-green-200 bg-green-50 text-green-700 hover:border-primary/50"
            }`}
          >
            Seat {seat.seat_number}
            <span className="block text-xs mt-0.5">{available ? "Available" : "Booked"}</span>
          </button>
        );
      })}
    </div>
  );
}
