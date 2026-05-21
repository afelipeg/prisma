import type { PrismIR, PrismField } from '@prism/core';

export interface HumanUiArtifacts {
  /** Field name (key in a record) projected to the card title slot. */
  title: string | undefined;
  subtitle: string | undefined;
  body: string | undefined;
  /** Image / hero field name. */
  image: string | undefined;
  price: string | undefined;
  stock: string | undefined;
  rating: string | undefined;

  /** Ordered list of fields to render on a card. */
  cardFields: PrismField[];
  /** Fields to surface in the detail view. */
  detailFields: PrismField[];
  /** Fields the catalog can be filtered by. */
  filterFields: PrismField[];
}

/** Emits the human-UI field mapping from the IR. */
export function emitHumanUi(ir: PrismIR): HumanUiArtifacts {
  const titleField = ir.fields.find((f) => f.annotations.display === 'title');
  const subtitleField = ir.fields.find((f) => f.annotations.display === 'subtitle');
  const bodyField = ir.fields.find((f) => f.annotations.display === 'body');

  const imageField = ir.fields.find(
    (f) =>
      f.annotations.genui === 'hero' &&
      f.type === 'string' &&
      f.name !== titleField?.name
  );

  const priceField = ir.fields.find(
    (f) => f.annotations.transactable && f.type === 'number' && !f.annotations.live
  );
  const stockField = ir.fields.find(
    (f) => f.annotations.live && f.annotations.transactable
  );
  const ratingField = ir.fields.find((f) => f.annotations.rating);

  const filterFields = ir.fields.filter(
    (f) => f.annotations.facet || f.annotations.filter
  );

  const detailFields = ir.fields.filter(
    (f) => f.annotations.genui === 'detail' || f.annotations.display === 'body'
  );

  // Card fields = those marked for card display, in IR order
  const cardFields = ir.fields.filter((f) => f.annotations.genui === 'card');

  return {
    title: titleField?.name,
    subtitle: subtitleField?.name,
    body: bodyField?.name,
    image: imageField?.name,
    price: priceField?.name,
    stock: stockField?.name,
    rating: ratingField?.name,
    cardFields,
    detailFields,
    filterFields,
  };
}
