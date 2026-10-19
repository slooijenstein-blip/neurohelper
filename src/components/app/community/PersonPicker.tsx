import { useState } from "react";
import { X } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import type { ClientPerson } from "@/lib/community-social/types";
import { useCommunitySocial } from "./social-context";

function Chips({
  people,
  onRemove,
  testPrefix,
}: {
  people: ClientPerson[];
  onRemove: (userId: string) => void;
  testPrefix: string;
}) {
  if (!people.length) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {people.map((person) => (
        <li key={person.userId}>
          <button
            type="button"
            data-testid={`${testPrefix}-chip-${person.userId}`}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold"
            onClick={() => onRemove(person.userId)}
          >
            {person.name}
            <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function NameSearch({
  label,
  placeholder,
  testId,
  groupId,
  selected,
  onSelect,
  exclude,
}: {
  label: string;
  placeholder: string;
  testId: string;
  groupId?: string | null | undefined;
  selected: ClientPerson[];
  onSelect: (person: ClientPerson) => void;
  exclude: string[];
}) {
  const { t } = useI18n();
  const social = useCommunitySocial();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientPerson[]>([]);
  const [empty, setEmpty] = useState(false);

  const search = (value: string) => {
    setQuery(value);
    const needle = value.trim();
    if (needle.length < 1) {
      setResults([]);
      setEmpty(false);
      return;
    }
    void social
      .searchPeople(needle, groupId)
      .then((people) => {
        const next = people.filter((person) => !exclude.includes(person.userId));
        setResults(next);
        setEmpty(next.length === 0);
      })
      .catch(() => {
        setResults([]);
        setEmpty(true);
      });
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-muted-foreground" htmlFor={testId}>
        {label}
      </label>
      <input
        id={testId}
        data-testid={testId}
        value={query}
        onChange={(event) => search(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        autoComplete="off"
      />
      {empty ? (
        <p className="text-[11px] text-muted-foreground">{t("community.social.noPeople")}</p>
      ) : null}
      {results.length ? (
        <ul className="overflow-hidden rounded-lg border border-border">
          {results.map((person) => (
            <li key={person.userId}>
              <button
                type="button"
                data-testid={`${testId}-result-${person.userId}`}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onSelect(person);
                  setQuery("");
                  setResults([]);
                  setEmpty(false);
                }}
              >
                {person.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Chips
        people={selected}
        testPrefix={testId}
        onRemove={(userId) => onSelect({ userId, name: "", role: "" })}
      />
    </div>
  );
}

/** Search people accounts by display name. Children are never offered. */
export function PersonPicker({
  groupId,
  tags,
  shares,
  onTags,
  onShares,
  testPrefix = "",
}: {
  groupId?: string | null;
  tags: ClientPerson[];
  shares: ClientPerson[];
  onTags: (people: ClientPerson[]) => void;
  onShares: (people: ClientPerson[]) => void;
  testPrefix?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-2" data-testid="person-picker">
      <NameSearch
        label={t("community.social.tagPeople")}
        placeholder={t("community.social.tagPlaceholder")}
        testId={`${testPrefix}tag-search`}
        groupId={groupId}
        selected={tags}
        exclude={tags.map((person) => person.userId)}
        onSelect={(person) => {
          if (!person.name) onTags(tags.filter((item) => item.userId !== person.userId));
          else if (!tags.some((item) => item.userId === person.userId)) onTags([...tags, person]);
        }}
      />
      <NameSearch
        label={t("community.social.sharePeople")}
        placeholder={t("community.social.sharePlaceholder")}
        testId={`${testPrefix}share-search`}
        groupId={groupId}
        selected={shares}
        exclude={shares.map((person) => person.userId)}
        onSelect={(person) => {
          if (!person.name) onShares(shares.filter((item) => item.userId !== person.userId));
          else if (!shares.some((item) => item.userId === person.userId))
            onShares([...shares, person]);
        }}
      />
    </div>
  );
}
