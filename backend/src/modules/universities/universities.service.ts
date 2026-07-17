import { NotFoundError } from "../../lib/errors.js";
import { universitiesRepository } from "./universities.repository.js";

export class UniversitiesService {
  list() {
    return universitiesRepository.listAll();
  }

  async getBySlug(slug: string) {
    const university = await universitiesRepository.findBySlug(slug);
    if (!university) {
      throw new NotFoundError("University not found");
    }
    return university;
  }
}

export const universitiesService = new UniversitiesService();
