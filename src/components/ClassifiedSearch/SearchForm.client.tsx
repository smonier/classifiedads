import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { JCRQueryBuilder } from "../../commons/libs/jcrQueryBuilder/index.js";
import type { Constraint, RenderNodeProps } from "../../commons/libs/jcrQueryBuilder/types.js";
import { useFormQuerySync } from "../../commons/hooks/useFormQuerySync.js";
import { normalizeLabel } from "../../utils/classifieds.js";
import classes from "./SearchForm.client.module.css";

const CATEGORY_OPTIONS = [
  "vehicle",
  "realEstate",
  "job",
  "service",
  "electronics",
  "furniture",
  "pet",
  "other",
];

const CONDITION_OPTIONS = ["new", "usedLikeNew", "usedGood", "usedFair", "refurbished"];
const ITEM_TYPE_OPTIONS = ["product", "service", "accommodation", "vehicle", "other"];
const AVAILABILITY_OPTIONS = ["inStock", "outOfStock", "reserved", "sold"];

type Props = {
  target?: string;
  builder?: JCRQueryBuilder;
  setNodes?: (nodes: RenderNodeProps[]) => void;
  mode?: "url" | "instant";
  placeholder?: string;
};

const formatLabel = (value: string) => normalizeLabel(value) ?? value;

const toOptionEntries = (values: string[]) =>
  values.map((value) => ({ value, label: formatLabel(value) }));

const CATEGORY_ENTRIES = toOptionEntries(CATEGORY_OPTIONS);
const CONDITION_ENTRIES = toOptionEntries(CONDITION_OPTIONS);
const ITEM_TYPE_ENTRIES = toOptionEntries(ITEM_TYPE_OPTIONS);
const AVAILABILITY_ENTRIES = toOptionEntries(AVAILABILITY_OPTIONS);

const getInitialSelections = (builder?: JCRQueryBuilder) => {
  if (!builder) {
    return {
      category: [] as string[],
      condition: [] as string[],
      itemType: [] as string[],
      availability: [] as string[],
      minPrice: "",
      maxPrice: "",
    };
  }
  const constraints = builder.getConstraints();
  const selections = {
    category: [] as string[],
    condition: [] as string[],
    itemType: [] as string[],
    availability: [] as string[],
    minPrice: "",
    maxPrice: "",
  };

  for (const constraint of constraints) {
    const { prop, operator, values } = constraint;
    if (!Array.isArray(values) || values.length === 0) {
      continue;
    }
    switch (prop) {
      case "category":
      case "condition":
      case "itemType":
      case "availability":
        selections[prop] = values.map(String);
        break;
      case "price": {
        const formatDecimal = (val: number) => (Number.isInteger(val) ? `${val}.0` : `${val}`);
        if (operator === ">=" && typeof values[0] === "number") {
          selections.minPrice = formatDecimal(values[0]);
        }
        if (operator === "<=" && typeof values[0] === "number") {
          selections.maxPrice = formatDecimal(values[0]);
        }
        break;
      }
      default:
        break;
    }
  }

  return selections;
};

type Option = { value: string; label: string };

const MultiSelectDropdown = ({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  const isChecked = (val: string) => values.includes(val);
  const handleToggle = (val: string) => {
    const next = isChecked(val) ? values.filter((v) => v !== val) : [...values, val];
    onChange(next);
  };
  const selectedPreview = values
    .map((v) => options.find((o) => o.value === v)?.label || v)
    .slice(0, 2)
    .join(", ");
  const extra = values.length > 2 ? ` +${values.length - 2}` : "";
  return (
    <div className={classes.dropdown} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={classes.dropdownButton}
        aria-expanded={open}
        onClick={toggle}
      >
        <span>{label}</span>
        <span className={classes.dropdownCount}>{values.length}</span>
        {values.length > 0 && (
          <span className={classes.dropdownPreview}>
            {selectedPreview}
            {extra}
          </span>
        )}
      </button>
      {open && (
        <div className={classes.dropdownMenu} role="menu">
          {options.map((opt) => (
            <label key={opt.value} className={classes.dropdownItem}>
              <input
                type="checkbox"
                checked={isChecked(opt.value)}
                onChange={() => handleToggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

const ClassifiedSearchFormClient = ({
  target,
  builder,
  setNodes,
  mode = target ? "url" : "instant",
  placeholder = "Search classifieds",
}: Props) => {
  const { updateParam, getUrlString } = useFormQuerySync(target ?? null);
  const initialSelections = useMemo(() => getInitialSelections(builder), [builder]);

  const [categories, setCategories] = useState<string[]>(initialSelections.category);
  const [conditions, setConditions] = useState<string[]>(initialSelections.condition);
  const [itemTypes, setItemTypes] = useState<string[]>(initialSelections.itemType);
  const [availability, setAvailability] = useState<string[]>(initialSelections.availability);
  const [minPrice, setMinPrice] = useState<string>(initialSelections.minPrice);
  const [maxPrice, setMaxPrice] = useState<string>(initialSelections.maxPrice);

  const executeBuilder = useCallback(async () => {
    if (mode !== "instant" || !builder || !setNodes) {
      return;
    }
    try {
      const data = await builder.execute();
      setNodes(data);
    } catch (error) {
      console.error("[ClassifiedSearch] Failed to execute query", error);
      setNodes([]);
    }
  }, [builder, mode, setNodes]);

  const applyFacetValues = useCallback(
    async (facet: "category" | "condition" | "itemType" | "availability", values: string[]) => {
      if (mode === "url") {
        updateParam(facet, values);
      } else if (builder) {
        builder.deleteConstraints(facet);
        if (values.length > 0) {
          builder.setConstraints([{ prop: facet, operator: "IN", values }]);
        }
      }
      await executeBuilder();
    },
    [builder, executeBuilder, mode, updateParam],
  );

  const handlePriceCommit = useCallback(async () => {
    if (mode === "url") {
      updateParam("minPrice", minPrice ? [minPrice] : []);
      updateParam("maxPrice", maxPrice ? [maxPrice] : []);
      return;
    }

    if (!builder) {
      return;
    }

    builder.deleteConstraints("price");
    const next: Constraint[] = [];

    const formatDecimal = (val: number) => (Number.isInteger(val) ? `${val}.0` : `${val}`);

    const minNumeric = Number.parseFloat(minPrice);
    if (!Number.isNaN(minNumeric)) {
      next.push({ prop: "price", operator: ">=", values: [formatDecimal(minNumeric)] });
    }
    const maxNumeric = Number.parseFloat(maxPrice);
    if (!Number.isNaN(maxNumeric)) {
      next.push({ prop: "price", operator: "<=", values: [formatDecimal(maxNumeric)] });
    }

    if (next.length > 0) {
      builder.setConstraints(next);
    }

    await executeBuilder();
  }, [builder, executeBuilder, maxPrice, minPrice, mode, updateParam]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (mode === "url" && target) {
        window.location.href = getUrlString();
        return;
      }

      if (mode === "instant") {
        void handlePriceCommit();
      }
    },
    [getUrlString, handlePriceCommit, mode, target],
  );

  const showSubmitButton = false; // replaced by Clear filters

  const hasAnyFilter =
    categories.length > 0 ||
    conditions.length > 0 ||
    itemTypes.length > 0 ||
    availability.length > 0 ||
    Boolean(minPrice) ||
    Boolean(maxPrice);

  const clearAll = useCallback(async () => {
    setCategories([]);
    setConditions([]);
    setItemTypes([]);
    setAvailability([]);
    setMinPrice("");
    setMaxPrice("");

    if (mode === "url") {
      updateParam("category", []);
      updateParam("condition", []);
      updateParam("itemType", []);
      updateParam("availability", []);
      updateParam("minPrice", []);
      updateParam("maxPrice", []);
      return;
    }

    if (builder) {
      builder.deleteConstraints("category");
      builder.deleteConstraints("condition");
      builder.deleteConstraints("itemType");
      builder.deleteConstraints("availability");
      builder.deleteConstraints("price");
    }
    await executeBuilder();
  }, [builder, executeBuilder, mode, updateParam]);

  const removeChip = useCallback(
    async (facet: "category" | "condition" | "itemType" | "availability", value: string) => {
      const current = {
        category: categories,
        condition: conditions,
        itemType: itemTypes,
        availability,
      }[facet];
      const next = current.filter((v) => v !== value);
      switch (facet) {
        case "category":
          setCategories(next);
          break;
        case "condition":
          setConditions(next);
          break;
        case "itemType":
          setItemTypes(next);
          break;
        case "availability":
          setAvailability(next);
          break;
      }
      await applyFacetValues(facet, next);
    },
    [applyFacetValues, availability, categories, conditions, itemTypes],
  );

  return (
    <form className={classes.form} onSubmit={handleSubmit}>
      {(placeholder || hasAnyFilter) && (
        <div className={classes.headerRow}>
          {placeholder && <p className={classes.intro}>{placeholder}</p>}
          <button
            type="button"
            className={classes.submitButton}
            disabled={!hasAnyFilter}
            onClick={() => void clearAll()}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className={classes.facets}>
        <MultiSelectDropdown
          label="Category"
          options={CATEGORY_ENTRIES}
          values={categories}
          onChange={async (vals) => {
            setCategories(vals);
            await applyFacetValues("category", vals);
          }}
        />
        <MultiSelectDropdown
          label="Condition"
          options={CONDITION_ENTRIES}
          values={conditions}
          onChange={async (vals) => {
            setConditions(vals);
            await applyFacetValues("condition", vals);
          }}
        />
        <MultiSelectDropdown
          label="Item Type"
          options={ITEM_TYPE_ENTRIES}
          values={itemTypes}
          onChange={async (vals) => {
            setItemTypes(vals);
            await applyFacetValues("itemType", vals);
          }}
        />
        <MultiSelectDropdown
          label="Availability"
          options={AVAILABILITY_ENTRIES}
          values={availability}
          onChange={async (vals) => {
            setAvailability(vals);
            await applyFacetValues("availability", vals);
          }}
        />
      </div>

      {(categories.length ||
        conditions.length ||
        itemTypes.length ||
        availability.length ||
        minPrice ||
        maxPrice) && (
        <div className={classes.chips}>
          {categories.map((v) => (
            <button
              key={`cat-${v}`}
              type="button"
              className={classes.chip}
              onClick={() => void removeChip("category", v)}
            >
              {formatLabel(v)}
              <span aria-hidden>×</span>
            </button>
          ))}
          {conditions.map((v) => (
            <button
              key={`cond-${v}`}
              type="button"
              className={classes.chip}
              onClick={() => void removeChip("condition", v)}
            >
              {formatLabel(v)}
              <span aria-hidden>×</span>
            </button>
          ))}
          {itemTypes.map((v) => (
            <button
              key={`type-${v}`}
              type="button"
              className={classes.chip}
              onClick={() => void removeChip("itemType", v)}
            >
              {formatLabel(v)}
              <span aria-hidden>×</span>
            </button>
          ))}
          {availability.map((v) => (
            <button
              key={`avail-${v}`}
              type="button"
              className={classes.chip}
              onClick={() => void removeChip("availability", v)}
            >
              {formatLabel(v)}
              <span aria-hidden>×</span>
            </button>
          ))}
          {minPrice && <span className={classes.chipStatic}>Min: {minPrice}</span>}
          {maxPrice && <span className={classes.chipStatic}>Max: {maxPrice}</span>}
        </div>
      )}

      <div className={classes.fieldGroup}>
        <label htmlFor="classified-search-minPrice">Min price</label>
        <input
          id="classified-search-minPrice"
          type="number"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
          onBlur={() => {
            const val = parseFloat(minPrice);
            if (!Number.isNaN(val)) {
              setMinPrice(Number.isInteger(val) ? `${val}.0` : `${val}`);
            }
            void handlePriceCommit();
          }}
          placeholder="0"
        />
      </div>

      <div className={classes.fieldGroup}>
        <label htmlFor="classified-search-maxPrice">Max price</label>
        <input
          id="classified-search-maxPrice"
          type="number"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          onBlur={() => {
            const val = parseFloat(maxPrice);
            if (!Number.isNaN(val)) {
              setMaxPrice(Number.isInteger(val) ? `${val}.0` : `${val}`);
            }
            void handlePriceCommit();
          }}
          placeholder="1000"
        />
      </div>
    </form>
  );
};

export default ClassifiedSearchFormClient;
