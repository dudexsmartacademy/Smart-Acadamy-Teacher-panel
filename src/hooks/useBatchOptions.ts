import { useEffect, useState } from "react";
import { batchService } from "../services/batchService";
import type { OptionItem } from "../components/CustomSelect";

/** Checklist options for every global batch ("Batch 1", "Batch 2"). */
export function useBatchOptions(): { options: OptionItem[]; loading: boolean; error: string | null } {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void batchService.getBatches().then((res) => {
      if (!active) return;
      setOptions(res.data.map((b) => ({ value: b.name, label: b.name })));
      setError(res.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { options, loading, error };
}
