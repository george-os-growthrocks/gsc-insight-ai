import { useState } from "react";
import { format, subDays, subMonths, subYears, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CompareRange {
  main: DateRange;
  compare: DateRange;
}

interface Props {
  value?: DateRange;
  compareValue?: CompareRange;
  onChange?: (range: DateRange) => void;
  onCompareChange?: (ranges: CompareRange) => void;
  mode?: "filter" | "compare";
}

export const DateRangePicker = ({
  value,
  compareValue,
  onChange,
  onCompareChange,
  mode = "filter",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(mode);
  const [filterRange, setFilterRange] = useState<DateRange | undefined>(value);
  const [compareRanges, setCompareRanges] = useState<CompareRange | undefined>(compareValue);

  // GSC has ~3 day delay
  const today = startOfDay(new Date());
  const maxDate = subDays(today, 3);

  const applyFilterPreset = (preset: string) => {
    let from: Date;
    let to = maxDate;

    switch (preset) {
      case "24h":
        from = subDays(maxDate, 1);
        break;
      case "7d":
        from = subDays(maxDate, 7);
        break;
      case "28d":
        from = subDays(maxDate, 28);
        break;
      case "90d":
        from = subDays(maxDate, 90);
        break;
      case "6m":
        from = subMonths(maxDate, 6);
        break;
      case "12m":
        from = subMonths(maxDate, 12);
        break;
      case "16m":
        from = subMonths(maxDate, 16);
        break;
      default:
        return;
    }

    const range = { from, to };
    setFilterRange(range);
    onChange?.(range);
    setOpen(false);
  };

  const applyComparePreset = (preset: string) => {
    let mainFrom: Date, mainTo: Date, compareFrom: Date, compareTo: Date;
    mainTo = maxDate;

    switch (preset) {
      case "24h_prev":
        mainFrom = subDays(maxDate, 1);
        compareTo = subDays(mainFrom, 1);
        compareFrom = subDays(compareTo, 1);
        break;
      case "24h_wow":
        mainFrom = subDays(maxDate, 1);
        compareTo = subDays(mainFrom, 7);
        compareFrom = subDays(compareTo, 1);
        break;
      case "7d_prev":
        mainFrom = subDays(maxDate, 7);
        compareTo = subDays(mainFrom, 1);
        compareFrom = subDays(compareTo, 7);
        break;
      case "7d_yoy":
        mainFrom = subDays(maxDate, 7);
        compareTo = subYears(mainTo, 1);
        compareFrom = subYears(mainFrom, 1);
        break;
      case "28d_prev":
        mainFrom = subDays(maxDate, 28);
        compareTo = subDays(mainFrom, 1);
        compareFrom = subDays(compareTo, 28);
        break;
      case "28d_yoy":
        mainFrom = subDays(maxDate, 28);
        compareTo = subYears(mainTo, 1);
        compareFrom = subYears(mainFrom, 1);
        break;
      case "3m_prev":
        mainFrom = subMonths(maxDate, 3);
        compareTo = subDays(mainFrom, 1);
        compareFrom = subMonths(compareTo, 3);
        break;
      case "3m_yoy":
        mainFrom = subMonths(maxDate, 3);
        compareTo = subYears(mainTo, 1);
        compareFrom = subYears(mainFrom, 1);
        break;
      case "6m_prev":
        mainFrom = subMonths(maxDate, 6);
        compareTo = subDays(mainFrom, 1);
        compareFrom = subMonths(compareTo, 6);
        break;
      default:
        return;
    }

    const ranges = {
      main: { from: mainFrom, to: mainTo },
      compare: { from: compareFrom, to: compareTo },
    };
    setCompareRanges(ranges);
    onCompareChange?.(ranges);
    setOpen(false);
  };

  const formatRange = (range?: DateRange) => {
    if (!range) return "Select date range";
    return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal w-full",
            !filterRange && !compareRanges && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {activeTab === "filter" ? formatRange(filterRange) : "Compare date ranges"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "filter" | "compare")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="filter">Filter</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
          </TabsList>

          <TabsContent value="filter" className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">QUICK RANGES</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => applyFilterPreset("24h")}>
                  Last 24 hours
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFilterPreset("7d")}>
                  Last 7 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFilterPreset("28d")}>
                  Last 28 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFilterPreset("90d")}>
                  Last 90 days
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFilterPreset("6m")}>
                  Last 6 months
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFilterPreset("12m")}>
                  Last 12 months
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFilterPreset("16m")}>
                  Last 16 months
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">CUSTOM RANGE</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterRange?.from ? format(filterRange.from, "yyyy-MM-dd") : "YYYY-MM-DD"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filterRange?.from}
                        onSelect={(date) =>
                          date && setFilterRange({ ...filterRange!, from: date })
                        }
                        disabled={(date) => date > maxDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-xs">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterRange?.to ? format(filterRange.to, "yyyy-MM-dd") : "YYYY-MM-DD"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filterRange?.to}
                        onSelect={(date) => date && setFilterRange({ ...filterRange!, to: date })}
                        disabled={(date) => date > maxDate || (filterRange?.from && date < filterRange.from)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={() => {
                    if (filterRange) {
                      onChange?.(filterRange);
                      setOpen(false);
                    }
                  }}
                  disabled={!filterRange?.from || !filterRange?.to}
                  className="w-full"
                >
                  Apply
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4 p-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">QUICK COMPARES</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("24h_prev")}
                  className="justify-start text-xs"
                >
                  Last 24 hours vs previous period
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("24h_wow")}
                  className="justify-start text-xs"
                >
                  Last 24 hours week over week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("7d_prev")}
                  className="justify-start text-xs"
                >
                  Last 7 days vs previous period
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("7d_yoy")}
                  className="justify-start text-xs"
                >
                  Last 7 days year over year
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("28d_prev")}
                  className="justify-start text-xs"
                >
                  Last 28 days vs previous period
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("28d_yoy")}
                  className="justify-start text-xs"
                >
                  Last 28 days year over year
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("3m_prev")}
                  className="justify-start text-xs"
                >
                  Last 3 months vs previous period
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("3m_yoy")}
                  className="justify-start text-xs"
                >
                  Last 3 months year over year
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyComparePreset("6m_prev")}
                  className="justify-start text-xs"
                >
                  Last 6 months vs previous period
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">CUSTOM COMPARE</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-medium">Main Period</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {compareRanges?.main.from
                            ? format(compareRanges.main.from, "yyyy-MM-dd")
                            : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={compareRanges?.main.from}
                          onSelect={(date) =>
                            date &&
                            setCompareRanges({
                              ...compareRanges!,
                              main: { ...compareRanges!.main, from: date },
                            })
                          }
                          disabled={(date) => date > maxDate}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {compareRanges?.main.to
                            ? format(compareRanges.main.to, "yyyy-MM-dd")
                            : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={compareRanges?.main.to}
                          onSelect={(date) =>
                            date &&
                            setCompareRanges({
                              ...compareRanges!,
                              main: { ...compareRanges!.main, to: date },
                            })
                          }
                          disabled={(date) => date > maxDate}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground">vs.</div>

                <div>
                  <Label className="text-xs font-medium">Compare Period</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {compareRanges?.compare.from
                            ? format(compareRanges.compare.from, "yyyy-MM-dd")
                            : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={compareRanges?.compare.from}
                          onSelect={(date) =>
                            date &&
                            setCompareRanges({
                              ...compareRanges!,
                              compare: { ...compareRanges!.compare, from: date },
                            })
                          }
                          disabled={(date) => date > maxDate}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {compareRanges?.compare.to
                            ? format(compareRanges.compare.to, "yyyy-MM-dd")
                            : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={compareRanges?.compare.to}
                          onSelect={(date) =>
                            date &&
                            setCompareRanges({
                              ...compareRanges!,
                              compare: { ...compareRanges!.compare, to: date },
                            })
                          }
                          disabled={(date) => date > maxDate}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (compareRanges) {
                      onCompareChange?.(compareRanges);
                      setOpen(false);
                    }
                  }}
                  disabled={
                    !compareRanges?.main.from ||
                    !compareRanges?.main.to ||
                    !compareRanges?.compare.from ||
                    !compareRanges?.compare.to
                  }
                  className="w-full"
                >
                  Apply
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
