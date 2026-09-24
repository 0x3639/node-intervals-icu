---
title: Custom items
---
# Custom items

`client.customItems` manages custom dashboard items such as charts, fields and histograms, including their sort order and images. All routes are athlete-scoped.

## Methods

| Method | What it does |
|---|---|
| {@link CustomItemService.list} | List all custom items for an athlete |
| {@link CustomItemService.get} | Get a specific custom item |
| {@link CustomItemService.create} | Create a new custom item |
| {@link CustomItemService.update} | Update a custom item |
| {@link CustomItemService.delete} | Delete a custom item |
| {@link CustomItemService.reorder} | Reorder custom items (update sort indexes) |
| {@link CustomItemService.uploadImage} | Upload an image for a custom item |

## Examples

### List and reorder

List the athlete's custom items, then reorder them into their current order — a no-op that exercises the route.

CI never runs this example; running it by hand writes to the authenticated account (harmlessly, since the order does not change).

{@includeCode ../../../examples/custom-items/list-and-reorder.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
