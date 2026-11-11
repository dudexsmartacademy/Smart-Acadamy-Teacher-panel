import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ClassForm from "./ClassForm";
import { liveClassService, type LiveClassItem } from "../../services/liveClassService";

export default function EditClass() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<LiveClassItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void liveClassService.getMyClassSessions().then((res) => {
      setItem(res.data.find((c) => c.id === id) || null);
      setError(res.error);
      setLoading(false);
    });
  }, [id]);

  if (item) return <ClassForm existing={item} />;

  return (
    <div className="p-6">
      <Link to="/classes" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16} />
        Back to Classes
      </Link>
      <p className="mt-6 rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
        {loading ? "Loading class…" : error ? `Could not load the class: ${error}` : "Class not found, or it was created by another teacher."}
      </p>
    </div>
  );
}
