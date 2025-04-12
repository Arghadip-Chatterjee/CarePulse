"use client";
import { useState } from "react";
import { Controller } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const daysOfWeek = [
  { label: "Sunday", value: "Sunday" },
  { label: "Monday", value: "Monday" },
  { label: "Tuesday", value: "Tuesday" },
  { label: "Wednesday", value: "Wednesday" },
  { label: "Thursday", value: "Thursday" },
  { label: "Friday", value: "Friday" },
  { label: "Saturday", value: "Saturday" },
];

const AvailableTimingsField = ({
  control,
  name,
}: {
  control: any;
  name: string;
}) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<Record<string, Date>>({});

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleTimeChange = (day: string, date: Date) => {
    setTimeSlots((prev) => ({ ...prev, [day]: date }));
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange } }) => (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Available Timings ({name.includes("Online") ? "Online" : "Offline"})
          </label>

          {/* Days Selection */}
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <label
                key={day.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDays.includes(day.value)}
                  onChange={() => toggleDay(day.value)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span>{day.label}</span>
              </label>
            ))}
          </div>

          {/* Time Pickers for Selected Days */}
          {selectedDays.map((day) => (
            <div key={day} className="flex items-center gap-4">
              <span className="font-medium">{day}</span>
              <DatePicker
                selected={timeSlots[day] || null}
                onChange={(date) => handleTimeChange(day, date as Date)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={30}
                timeCaption="Time"
                dateFormat="h:mm aa"
                className="border p-2 rounded-md"
              />
            </div>
          ))}

          {/* Sync with form state */}
          <button
            type="button"
            className="mt-2 bg-primary text-white px-4 py-2 rounded-md"
            onClick={() =>
              onChange(
                selectedDays.map(
                  (day) =>
                    `${day}: ${timeSlots[day]?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                )
              )
            }
          >
            Save Timings
          </button>
        </div>
      )}
    />
  );
};

export default AvailableTimingsField;
